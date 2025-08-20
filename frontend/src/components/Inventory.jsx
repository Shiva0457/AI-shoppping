import React, {useEffect, useState} from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Inventory({token, user, onLogout}){
  const [items,setItems] = useState([]);
  const [form, setForm] = useState({product_name:'',quantity:1,unit:'pcs',threshold:1,expiry_date:''});
  const [recs, setRecs] = useState([]);

  useEffect(()=>{ fetchItems(); fetchRecs(); }, []);

  async function fetchItems(){
    const res = await axios.get(API+'/api/inventory', { headers: { Authorization: 'Bearer '+token }});
    setItems(res.data);
  }
  async function fetchRecs(){
    const res = await axios.get(API+'/api/recommendations', { headers: { Authorization: 'Bearer '+token }});
    setRecs(res.data);
  }
  async function addItem(e){
    e.preventDefault();
    await axios.post(API+'/api/inventory', form, { headers: { Authorization: 'Bearer '+token }});
    setForm({product_name:'',quantity:1,unit:'pcs',threshold:1,expiry_date:''});
    fetchItems(); fetchRecs();
  }
  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', maxWidth:800, margin:'12px auto'}}>
        <h2>Welcome {user?.email}</h2>
        <div>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="card" style={{maxWidth:800, margin:'12px auto'}}>
        <h3>Add inventory item</h3>
        <form onSubmit={addItem}>
          <input placeholder="Product name" value={form.product_name} onChange={e=>setForm({...form, product_name:e.target.value})} />
          <div className="row">
            <input placeholder="Quantity" type="number" value={form.quantity} onChange={e=>setForm({...form, quantity: Number(e.target.value)})} />
            <input placeholder="Unit" value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})} />
          </div>
          <input placeholder="Threshold" type="number" value={form.threshold} onChange={e=>setForm({...form, threshold: Number(e.target.value)})} />
          <input placeholder="Expiry date (YYYY-MM-DD)" value={form.expiry_date} onChange={e=>setForm({...form, expiry_date:e.target.value})} />
          <button type="submit">Add</button>
        </form>
      </div>

      <div className="card" style={{maxWidth:800, margin:'12px auto'}}>
        <h3>Your inventory</h3>
        {items.length===0 && <div>No items yet.</div>}
        <ul>
          {items.map(it=> <li key={it.id}>{it.product_name} — {it.quantity} {it.unit} (threshold: {it.threshold})</li>)}
        </ul>
      </div>

      <div className="card" style={{maxWidth:800, margin:'12px auto'}}>
        <h3>Recommendations (below threshold)</h3>
        {recs.length===0 && <div>No recommendations right now.</div>}
        <ul>
          {recs.map(r=> <li key={r.id}>{r.product_name} — {r.quantity} left (threshold {r.threshold})</li>)}
        </ul>
      </div>
    </div>
  );
}
