import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("finance.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    person TEXT DEFAULT 'Felipe',
    is_recurring INTEGER DEFAULT 0,
    installments INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    UNIQUE(name, type)
  );
`);

// Seed default categories if empty
const categoryCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
if (categoryCount.count === 0) {
  const defaultCategories = {
    income: ["Salário", "Investimentos", "Presente", "Outros"],
    expense: ["Alimentação", "Moradia", "Transporte", "Lazer", "Saúde", "Educação", "Compras", "Outros"],
  };

  const insertCategory = db.prepare("INSERT INTO categories (name, type) VALUES (?, ?)");
  for (const name of defaultCategories.income) insertCategory.run(name, "income");
  for (const name of defaultCategories.expense) insertCategory.run(name, "expense");
}

// Ensure columns exist if table was already created
try {
  db.exec("ALTER TABLE transactions ADD COLUMN is_recurring INTEGER DEFAULT 0");
} catch (e) {}
try {
  db.exec("ALTER TABLE transactions ADD COLUMN installments INTEGER DEFAULT 1");
} catch (e) {}
try {
  db.exec("ALTER TABLE transactions ADD COLUMN person TEXT DEFAULT 'Felipe'");
} catch (e) {
  // Columns likely already exist
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // API Route: Reconhecimento Inteligente de Pedidos, Notas Fiscais e Comprovantes via Gemini
  app.post("/api/scan-receipt", async (req, res) => {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Nenhuma imagem fornecida para leitura." });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Chave GEMINI_API_KEY não configurada. Por favor, adicione sua chave nas configurações (Settings/Secrets) do Google AI Studio para ativar o escaneamento inteligente de notas e pedidos.",
      });
    }

    try {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const currentYear = new Date().getFullYear();
      const prompt = `Você é um auditor financeiro e especialista em visão computacional focado em notas fiscais, cupons, faturas, recibos e PEDIDOS de compras (restaurantes, delivery como iFood, lojas físicas e online).

Analise atentamente a foto deste pedido ou comprovante e extraia as seguintes informações:

1. VALOR TOTAL (CRÍTICO):
   - Localize o valor total final pago ou a pagar da compra (ex: procure por "TOTAL", "TOTAL A PAGAR", "VALOR TOTAL", "TOTAL R$", "VALOR LÍQUIDO", "TOTAL DO PEDIDO", "VALOR PAGO").
   - Se o documento tiver múltiplos itens e não tiver um campo "TOTAL" explícito, some o valor dos itens para encontrar o total da compra.
   - Não confunda o valor total com troco, taxas individuais isoladas, descontos parciais ou CNPJ.
   - Retorne o valor estritamente como número decimal positivo (exemplo: 42.50 ou 189.90).

2. TIPO DE PRODUTO E CATEGORIZAÇÃO:
   - Identifique com cuidado quais produtos ou serviços foram adquiridos (ex: lanche, refeição, café, pizza, remédio, gasolina, supermercado, eletrônico, roupa, conta).
   - Com base no TIPO DE PRODUTO analisado, selecione a categoria mais adequada:
     * "Alimentação": Comidas, lanches, bebidas de consumo imediato, restaurantes, hamburguerias, padarias, cafeterias, delivery (iFood, comanda de restaurante, marmitas).
     * "Supermercado": Compras de mantimentos para a casa, despensa, hortifrúti, açougue, produtos de limpeza ou higiene pessoal em mercados.
     * "Transporte": Combustível, gasolina, etanol, corridas de aplicativo (Uber, 99), táxi, pedágio, estacionamento, passagens, mecânica.
     * "Saúde": Farmácias, medicamentos, remédios, consultas médicas, exames laboratoriais, dentista, ótica.
     * "Moradia": Contas de consumo doméstico (luz, água, gás, internet), aluguel, condomínio, manutenção ou reparos da casa.
     * "Compras": Roupas, calçados, eletrônicos, cosméticos, acessórios, itens pessoais em lojas de departamento ou e-commerce.
     * "Lazer": Cinema, teatro, shows, jogos, viagens, passeios, streaming.
     * "Educação": Livros, cursos, mensalidades escolares ou universitárias, material didático.
     * "Outros": Apenas se os produtos não se encaixarem em nenhuma das categorias acima.

3. ESTABELECIMENTO / DESCRIÇÃO:
   - "estabelecimento": Nome da loja, restaurante, app ou fornecedor (ex: "Cantina da Nonna", "iFood", "Droga Raia", "Posto Shell").
   - "descricao_formatada": Um resumo limpo e amigável da compra incluindo o local e os principais itens (ex: "Cantina da Nonna - Almoço", "Droga Raia - Medicamentos").
   - "produtos_identificados": Uma lista breve dos produtos identificados no pedido (ex: ["Hambúrguer Artesanal", "Batata Frita", "Refrigerante"]).

4. DATA DA COMPRA:
   - No formato ISO 'YYYY-MM-DD'. Se o ano não constar, use o ano corrente (${currentYear}). Se não encontrar data, use a data atual.

5. TIPO:
   - "SAIDA" para qualquer despesa, pedido ou compra. "ENTRADA" apenas se for comprovante de depósito ou salário.`;

      const contents = [
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: cleanBase64,
          },
        },
        {
          text: prompt,
        },
      ];

      const config = {
        systemInstruction:
          "Você é um especialista em OCR e auditoria financeira focado em reconhecimento de pedidos e notas fiscais brasileiras. Sempre extraia o valor total numérico e classifique a categoria com base no tipo exato de produto.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estabelecimento: {
              type: Type.STRING,
              description: "Nome da loja, restaurante ou fornecedor",
            },
            descricao_formatada: {
              type: Type.STRING,
              description: "Título amigável para o lançamento",
            },
            produtos_identificados: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de produtos ou itens identificados no pedido",
            },
            data: {
              type: Type.STRING,
              description: "Data da compra no formato YYYY-MM-DD",
            },
            valor: {
              type: Type.NUMBER,
              description: "Valor total líquido da compra como número decimal",
            },
            categoria: {
              type: Type.STRING,
              description: "Categoria selecionada com base no tipo de produto",
            },
            tipo: {
              type: Type.STRING,
              enum: ["SAIDA", "ENTRADA"],
              description: "'SAIDA' ou 'ENTRADA'",
            },
            motivo_categoria: {
              type: Type.STRING,
              description: "Breve explicação do porquê essa categoria foi escolhida",
            },
          },
          required: ["estabelecimento", "descricao_formatada", "data", "valor", "categoria", "tipo"],
        },
      };

      // Modelo com fallback resiliente para evitar erros transitórios de alta demanda
      const modelsToTry = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
      let lastError: any = null;
      let responseText = "";

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config,
          });
          responseText = response.text?.trim() || "";
          if (responseText) break;
        } catch (err: any) {
          console.warn(`Tentativa com modelo ${model} falhou:`, err?.message || err);
          lastError = err;
          // Espera breve antes do fallback
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (!responseText) {
        throw lastError || new Error("O modelo não conseguiu extrair dados do pedido.");
      }

      const extractedData = JSON.parse(responseText);
      res.json(extractedData);
    } catch (error: any) {
      console.error("Erro na leitura do comprovante via Gemini:", error);
      res.status(500).json({
        error: error?.message || "Não foi possível analisar a imagem da nota fiscal.",
      });
    }
  });

  // API Routes
  app.get("/api/categories", (req, res) => {
    try {
      const categories = db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", (req, res) => {
    const { name, type } = req.body;
    try {
      const info = db.prepare("INSERT INTO categories (name, type) VALUES (?, ?)").run(name, type);
      res.json({ id: info.lastInsertRowid, name, type });
    } catch (error) {
      if ((error as any).code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "Category already exists" });
      } else {
        res.status(500).json({ error: "Failed to add category" });
      }
    }
  });

  app.get("/api/transactions", (req, res) => {
    try {
      const transactions = db.prepare("SELECT * FROM transactions ORDER BY date DESC, id DESC").all();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", (req, res) => {
    const { description, amount, type, category, date, isRecurring, installments = 1, person = 'Felipe' } = req.body;
    try {
      const insert = db.prepare(
        "INSERT INTO transactions (description, amount, type, category, date, person, is_recurring, installments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );

      if (isRecurring && installments > 1) {
        const transactionDate = new Date(date + "T00:00:00");
        const results = [];
        
        for (let i = 0; i < installments; i++) {
          const currentMonthDate = new Date(transactionDate);
          currentMonthDate.setMonth(transactionDate.getMonth() + i);
          
          // Format date back to YYYY-MM-DD
          const formattedDate = currentMonthDate.toISOString().split('T')[0];
          
          const info = insert.run(
            description + (installments > 1 ? ` (${i + 1}/${installments})` : ""),
            amount,
            type,
            category,
            formattedDate,
            person,
            1,
            installments
          );
          results.push({ id: info.lastInsertRowid });
        }
        res.json(results[0]);
      } else {
        const info = insert.run(description, amount, type, category, date, person, isRecurring ? 1 : 0, installments);
        res.json({ id: info.lastInsertRowid });
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
      res.status(500).json({ error: "Failed to add transaction" });
    }
  });

  app.delete("/api/transactions/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
