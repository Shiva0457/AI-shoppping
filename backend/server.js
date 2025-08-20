const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const { parse } = require('csv-parse');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const SECRET = process.env.JWT_SECRET || 'change_this_secret';
const DB_FILE = 'data.db';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// init db
const db = new sqlite3.Database(DB_FILE);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    lat REAL,
    lng REAL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_name TEXT,
    quantity REAL,
    unit TEXT,
    threshold REAL,
    expiry_date TEXT,
    last_updated TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS shop_prices (
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
  )`);
});

function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'no token'});
  const token = auth.split(' ')[1];
  jwt.verify(token, SECRET, (err, payload)=>{
    if(err) return res.status(401).json({error:'invalid token'});
    req.user = payload;
    next();
  });
}

app.post('/api/auth/register', async (req,res)=>{
  const {name,email,password} = req.body;
  if(!email || !password) return res.status(400).json({error:'email/password required'});
  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)', [name,email,hash], function(err){
    if(err) return res.status(400).json({error:err.message});
    const user = {id: this.lastID, email};
    const token = jwt.sign(user, SECRET);
    res.json({token, user});
  });
});

app.post('/api/auth/login', (req,res)=>{
  const {email,password} = req.body;
  if(!email || !password) return res.status(400).json({error:'email/password required'});
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(400).json({error:'no such user'});
    const ok = await bcrypt.compare(password, row.password_hash);
    if(!ok) return res.status(400).json({error:'invalid credentials'});
    const user = {id: row.id, email: row.email};
    const token = jwt.sign(user, SECRET);
    res.json({token, user});
  });
});

// inventory routes
app.get('/api/inventory', authMiddleware, (req,res)=>{
  db.all('SELECT * FROM inventory WHERE user_id = ?', [req.user.id], (err,rows)=>{
    if(err) return res.status(500).json({error:err.message});
    res.json(rows);
  });
});

app.post('/api/inventory', authMiddleware, (req,res)=>{
  const {product_name,quantity,unit,threshold,expiry_date} = req.body;
  const now = new Date().toISOString();
  db.run('INSERT INTO inventory (user_id,product_name,quantity,unit,threshold,expiry_date,last_updated) VALUES (?,?,?,?,?,?,?)',
    [req.user.id, product_name, quantity||0, unit||'', threshold||0, expiry_date||'', now],
    function(err){
      if(err) return res.status(500).json({error:err.message});
      res.json({id:this.lastID});
  });
});

app.put('/api/inventory/:id', authMiddleware, (req,res)=>{
  const id = req.params.id;
  const {product_name,quantity,unit,threshold,expiry_date} = req.body;
  const now = new Date().toISOString();
  db.run('UPDATE inventory SET product_name=?,quantity=?,unit=?,threshold=?,expiry_date=?,last_updated=? WHERE id=? AND user_id=?',
    [product_name,quantity,unit,threshold,expiry_date,now,id,req.user.id],
    function(err){
      if(err) return res.status(500).json({error:err.message});
      res.json({changes:this.changes});
  });
});

app.delete('/api/inventory/:id', authMiddleware, (req,res)=>{
  const id = req.params.id;
  db.run('DELETE FROM inventory WHERE id=? AND user_id=?', [id, req.user.id], function(err){
    if(err) return res.status(500).json({error:err.message});
    res.json({deleted: this.changes});
  });
});

// recommendation endpoint (simple threshold rule)
app.get('/api/recommendations', authMiddleware, (req,res)=>{
  db.all('SELECT * FROM inventory WHERE user_id = ? AND quantity <= threshold', [req.user.id], (err,rows)=>{
    if(err) return res.status(500).json({error:err.message});
    res.json(rows);
  });
});

// shops price lookup
app.get('/api/shops', (req,res)=>{
  const product = req.query.product || '';
  const city = req.query.city || '';
  let sql = 'SELECT * FROM shop_prices WHERE product_name LIKE ?';
  const params = ['%'+product+'%'];
  if(city) { sql += ' AND city LIKE ?'; params.push('%'+city+'%'); }
  db.all(sql, params, (err,rows)=>{
    if(err) return res.status(500).json({error:err.message});
    res.json(rows.slice(0,50));
  });
});

// CSV upload & import (simple)
app.post('/api/admin/upload-csv', upload.single('file'), (req,res)=>{
  const file = req.file;
  if(!file) return res.status(400).json({error:'file missing'});
  const parser = fs.createReadStream(file.path).pipe(parse({columns:true, trim:true}));
  const toInsert = [];
  parser.on('data', (row)=>{
    toInsert.push(row);
  });
  parser.on('end', ()=>{
    const stmt = db.prepare(`INSERT INTO shop_prices
      (shop_id,shop_name,product_name,brand,price,currency,address,city,pincode,latitude,longitude,last_updated)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    db.serialize(()=>{
      toInsert.forEach(r=>{
        stmt.run(
          r.shop_id, r.shop_name, r.product_name, r.brand, r.price||0, r.currency||'INR',
          r.address, r.city, r.pincode, r.latitude||0, r.longitude||0, r.last_updated||''
        );
      });
      stmt.finalize();
      fs.unlinkSync(file.path);
      res.json({imported: toInsert.length});
    });
  });
  parser.on('error',(e)=> res.status(500).json({error:e.message}));
});

// simple health
app.get('/', (req,res)=> res.send('AI Shopping Assistant backend running'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log('Server listening on', PORT));
