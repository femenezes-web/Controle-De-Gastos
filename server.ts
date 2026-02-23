import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

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
  db.exec("ALTER TABLE transactions ADD COLUMN installments INTEGER DEFAULT 1");
} catch (e) {
  // Columns likely already exist
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
    const { description, amount, type, category, date, isRecurring, installments = 1 } = req.body;
    try {
      const insert = db.prepare(
        "INSERT INTO transactions (description, amount, type, category, date, is_recurring, installments) VALUES (?, ?, ?, ?, ?, ?, ?)"
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
            1,
            installments
          );
          results.push({ id: info.lastInsertRowid });
        }
        res.json(results[0]);
      } else {
        const info = insert.run(description, amount, type, category, date, isRecurring ? 1 : 0, installments);
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
