// init_db.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS shop_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id TEXT,
      shop_name TEXT,
      product_name TEXT,
      brand TEXT,
      price REAL,
      currency TEXT,
      address TEXT,
      city TEXT,
      pincode TEXT,
      latitude REAL,
      longitude REAL,
      last_updated TEXT
    )
  `);

  console.log("✅ Database initialized: shop_prices table created (if not exists).");
});

db.close();
