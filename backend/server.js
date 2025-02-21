const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const app = express();
const cors = require("cors");
app.use(cors())
const port = 5000;

// Add middleware to parse JSON bodies
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('transactions2.db');

// Create table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY,
    title TEXT,
    description TEXT,
    price REAL,
    dateOfSale TEXT,
    category TEXT,
    sold BOOLEAN,
    image TEXT
  )`);
});

// Initialize database with seed data
app.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const transactions = response.data;

    // First clear the existing data
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM transactions', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const stmt = db.prepare(`INSERT INTO transactions 
      (title, description, price, dateOfSale, category, sold,image) 
      VALUES (?, ?, ?, ?, ?, ?,?)`);

    transactions.forEach(transaction => {
      stmt.run([
        transaction.title,
        transaction.description,
        transaction.price,
        transaction.dateOfSale,
        transaction.category,
        transaction.sold,
        transaction.image
      ]);
    });

    stmt.finalize();
    res.json({ message: 'Database initialized successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List transactions with search and pagination
app.get('/api/transactions', (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;
    const month = req.query.month || '3'; // Default to March if not specified
    
    if (isNaN(page) || page < 1) {
      return res.status(400).json({ error: 'Invalid page number' });
    }

    if (isNaN(perPage) || perPage < 1) {
      return res.status(400).json({ error: 'Invalid per page value' });
    }

    const monthStr = month.toString().padStart(2, '0');
    const offset = (page - 1) * perPage;

    const searchParam = `%${search}%`;

    // First get total count
    db.get(
      `SELECT COUNT(*) as total FROM transactions 
       WHERE strftime('%m', dateOfSale) = ? 
       AND (title LIKE ? OR description LIKE ? OR CAST(price AS TEXT) LIKE ?)`,
      [monthStr, searchParam, searchParam, searchParam],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const total = row.total;

        // Then get paginated results
        db.all(
          `SELECT * FROM transactions 
           WHERE strftime('%m', dateOfSale) = ? 
           AND (title LIKE ? OR description LIKE ? OR CAST(price AS TEXT) LIKE ?)
           LIMIT ? OFFSET ?`,
          [monthStr, searchParam, searchParam, searchParam, perPage, offset],
          (err, rows) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({
              data: rows,
              total,
              page,
              totalPages: Math.ceil(total / perPage)
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistics API
app.get('/api/statistics', (req, res) => {
  try {
    const month = req.query.month || '3'; // Default to March if not specified
    const monthStr = month.toString().padStart(2, '0');

    const queries = {
      totalSale: `
        SELECT COALESCE(SUM(price), 0) as total 
        FROM transactions 
        WHERE strftime('%m', dateOfSale) = ? AND sold = 1
      `,
      soldItems: `
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE strftime('%m', dateOfSale) = ? AND sold = 1
      `,
      unsoldItems: `
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE strftime('%m', dateOfSale) = ? AND sold = 0
      `
    };

    const statistics = {};

    db.get(queries.totalSale, [monthStr], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      statistics.totalSaleAmount = row.total;

      db.get(queries.soldItems, [monthStr], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        statistics.totalSoldItems = row.count;

        db.get(queries.unsoldItems, [monthStr], (err, row) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          statistics.totalUnsoldItems = row.count;
          res.json(statistics);
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bar Chart API
app.get('/api/bar-chart', (req, res) => {
  try {
    const month = req.query.month || '3'; // Default to March if not specified
    const monthStr = month.toString().padStart(2, '0');

    const ranges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: 999999 } // Using a large number instead of Infinity
    ];

    const priceRanges = {};
    let completed = 0;

    ranges.forEach(range => {
      const query = `
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE strftime('%m', dateOfSale) = ? 
        AND price >= ? 
        AND price <= ?
      `;

      db.get(query, [monthStr, range.min, range.max], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const rangeKey = range.max === 999999 ? '901-above' : `${range.min}-${range.max}`;
        priceRanges[rangeKey] = row.count;

        completed++;
        if (completed === ranges.length) {
          res.json(priceRanges);
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pie Chart API
app.get('/api/pie-chart', (req, res) => {
  try {
    const month = req.query.month || '3'; // Default to March if not specified
    const monthStr = month.toString().padStart(2, '0');

    const query = `
      SELECT category, COUNT(*) as count 
      FROM transactions 
      WHERE strftime('%m', dateOfSale) = ?
      GROUP BY category
    `;

    db.all(query, [monthStr], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const categoryData = {};
      rows.forEach(row => {
        categoryData[row.category] = row.count;
      });
      
      res.json(categoryData);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Combined API
app.get('/api/combined-data', async (req, res) => {
  try {
    const month = req.query.month || '3'; // Default to March if not specified

    const [statistics, barChart, pieChart] = await Promise.all([
      axios.get(`http://localhost:${port}/api/statistics?month=${month}`),
      axios.get(`http://localhost:${port}/api/bar-chart?month=${month}`),
      axios.get(`http://localhost:${port}/api/pie-chart?month=${month}`)
    ]);

    res.json({
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});