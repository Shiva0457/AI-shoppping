import React, {useState} from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Login({onLogin}){
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [name,setName]=useState(''), [isRegister,setIsRegister]=useState(false), [err,setErr]=useState('');
  async function submit(e){
    e.preventDefault();
    setErr('');
    try{
      const path = isRegister?'/api/auth/register':'/api/auth/login';
      const payload = isRegister?{name,email,password}:{email,password};
      const res = await axios.post(API+path, payload);
      onLogin(res.data.token, res.data.user);
    }catch(e){ setErr(e.response?.data?.error || e.message); }
  }
  return (
    <div className="card">
      <h2>{isRegister?'Register':'Login'}</h2>
      {err && <div style={{color:'red'}}>{err}</div>}
      {isRegister && <input placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />}
      <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button onClick={submit}>{isRegister?'Create account':'Sign in'}</button>
      <div style={{textAlign:'center', marginTop:8}}>
        <small><a href="#" onClick={(e)=>{e.preventDefault(); setIsRegister(!isRegister); }}>{isRegister?'Have an account? Login':'Create new account'}</a></small>
      </div>
    </div>
  )
}
