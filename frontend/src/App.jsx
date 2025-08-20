import React, {useState} from 'react'
import Login from './components/Login'
import Inventory from './components/Inventory'

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('token')||'');
  const [user, setUser] = useState(localStorage.getItem('user')?JSON.parse(localStorage.getItem('user')):null);
  if(!token) return <Login onLogin={(t,u)=>{ setToken(t); setUser(u); localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)); }} />;
  return <Inventory token={token} user={user} onLogout={()=>{ localStorage.clear(); setToken(''); setUser(null); }} />;
}
