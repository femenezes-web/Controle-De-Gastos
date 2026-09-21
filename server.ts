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

  // API Route: Reconhecimento de Notas Fiscais e Comprovantes via Gemini
  app.post("/api/scan-receipt", async (req, res) => {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Nenhuma imagem fornecida para leitura." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Chave GEMINI_API_KEY não configurada. Verifique as configurações do projeto.",
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

      const prompt = `Analise detalhadamente a foto desta nota fiscal, cupom fiscal, fatura ou recibo de pagamento/PIX.
Extraia os dados da transação com o máximo de precisão possível:
1. "estabelecimento": Nome da loja, supermercado, restaurante, prestador de serviço ou empresa beneficiária. Se não encontrar o nome fantasia, procure a razão social ou nome do favorecido.
2. "data": Data da compra ou emissão no formato ISO 'YYYY-MM-DD'. Se o ano não constar expressamente, use o ano corrente (${new Date().getFullYear()}).
3. "valor": Valor total final líquido da compra ou pagamento, expresso como número decimal (exemplo: 89.90 ou 1500.00). Não adicione símbolo de moeda.
4. "categoria": Categoria sugerida mais apropriada para a transação. Escolha entre: "Alimentação", "Supermercado", "Transporte", "Moradia", "Saúde", "Lazer", "Educação", "Compras", "Investimentos", "Salário" ou "Outros".
5. "tipo": Classifique como "SAIDA" para despesas, pagamentos, compras no débito/crédito, ou como "ENTRADA" para comprovantes de depósito, recebimento ou salário.

Retorne estritamente o JSON com esses campos.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
        config: {
          systemInstruction:
            "Você é um especialista em OCR e auditoria contábil focado na extração automatizada de dados de comprovantes e notas fiscais brasileiras.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              estabelecimento: {
                type: Type.STRING,
                description: "Nome da loja ou fornecedor",
              },
              data: {
                type: Type.STRING,
                description: "Data da compra no formato YYYY-MM-DD",
              },
              valor: {
                type: Type.NUMBER,
                description: "Valor total como número decimal",
              },
              categoria: {
                type: Type.STRING,
                description: "Categoria sugerida (ex: Supermercado, Transporte, Alimentação, Saúde, Lazer, Outros)",
              },
              tipo: {
                type: Type.STRING,
                enum: ["SAIDA", "ENTRADA"],
                description: "'SAIDA' ou 'ENTRADA'",
              },
            },
            required: ["estabelecimento", "data", "valor", "categoria", "tipo"],
          },
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        return res.status(500).json({ error: "O modelo não conseguiu extrair dados do comprovante." });
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
