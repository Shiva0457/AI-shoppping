// simple CSV import script for backend developer use
const fs = require('fs');
const { parse } = require('csv-parse');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

const file = process.argv[2];
if(!file){ console.error('Usage: node import_csv.js path/to/file.csv'); process.exit(1); }

const rows = [];
fs.createReadStream(file).pipe(parse({columns:true, trim:true}))
  .on('data', (r)=> rows.push(r))
  .on('end', ()=>{
    const stmt = db.prepare(`INSERT INTO shop_prices
      (shop_id,shop_name,product_name,brand,price,currency,address,city,pincode,latitude,longitude,last_updated)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    rows.forEach(r=>{
      stmt.run(r.shop_id, r.shop_name, r.product_name, r.brand, r.price||0, r.currency||'INR',
               r.address, r.city, r.pincode, r.latitude||0, r.longitude||0, r.last_updated||'');
    });
    stmt.finalize(()=> {
      console.log('Imported', rows.length, 'rows');
      db.close();
    });
  });
