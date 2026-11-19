
import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../api.js";

const STATUSES = ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];
export default function Admin() {
  const [token,setToken]=useState(localStorage.getItem("fitfuelAdminToken")||"");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [tab,setTab]=useState("dashboard");
  const [data,setData]=useState({dashboard:null,orders:[],contacts:[],feedback:[],products:[]});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const request=useCallback(async(path,options={})=>{
    const response=await fetch(`${API_BASE}/admin${path}`,{...options,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,...(options.headers||{})}});
    const result=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(result.message||"Admin request failed");
    return result;
  },[token]);
  const load=useCallback(async()=>{
    if(!token)return;
    setBusy(true);setError("");
    try{
      const [dashboard,orders,contacts,feedback,products]=await Promise.all(["/dashboard","/orders","/contacts","/feedback","/products"].map(request));
      setData({dashboard,orders,contacts,feedback,products});
    }catch(e){setError(e.message);if(/session|token/i.test(e.message)){localStorage.removeItem("fitfuelAdminToken");setToken("");}}
    finally{setBusy(false);}
  },[token,request]);
  useEffect(()=>{load();},[load]);
  async function login(e){
    e.preventDefault();setError("");setBusy(true);
    try{
      const response=await fetch(`${API_BASE}/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const result=await response.json();if(!response.ok)throw new Error(result.message||"Login failed");
      localStorage.setItem("fitfuelAdminToken",result.token);setToken(result.token);setPassword("");
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }
  async function action(path,method,body){
    try{await request(path,{method,body:body?JSON.stringify(body):undefined});await load();}
    catch(e){setError(e.message);}
  }
  function logout(){localStorage.removeItem("fitfuelAdminToken");setToken("");setData({dashboard:null,orders:[],contacts:[],feedback:[],products:[]});}
  if(!token)return <main className="container py-5"><div className="mx-auto card shadow-sm p-4" style={{maxWidth:440}}><h2 className="mb-3">FitFuel Admin Login</h2>{error&&<div className="alert alert-danger">{error}</div>}<form onSubmit={login}><label className="form-label">Admin email</label><input className="form-control mb-3" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label className="form-label">Password</label><input className="form-control mb-3" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="btn btn-success w-100" disabled={busy}>{busy?"Please wait...":"Login"}</button></form></div></main>;
  return <main className="container-fluid py-4 px-lg-5"><div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"><div><p className="text-success mb-1">FITFUEL MANAGEMENT</p><h1 className="h2 mb-0">Admin Dashboard</h1></div><div><button className="btn btn-outline-secondary me-2" onClick={load}>Refresh</button><button className="btn btn-dark" onClick={logout}>Logout</button></div></div>
    {error&&<div className="alert alert-danger">{error}</div>}{busy&&<p>Loading dashboard...</p>}
    <div className="d-flex flex-wrap gap-2 mb-4">{["dashboard","orders","contacts","feedback","products"].map(x=><button key={x} className={`btn ${tab===x?"btn-success":"btn-outline-success"}`} onClick={()=>setTab(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div>
    {tab==="dashboard"&&data.dashboard&&<div className="row g-3">{Object.entries({"Total Orders":data.dashboard.orders,"Contact Messages":data.dashboard.contacts,"Feedback":data.dashboard.feedback,"Products":data.dashboard.products,"Paid Revenue":`₹${data.dashboard.revenue}`}).map(([k,v])=><div className="col-6 col-md-4 col-xl" key={k}><div className="card shadow-sm h-100 p-3"><div className="text-muted">{k}</div><div className="h3 mb-0 mt-2">{v}</div></div></div>)}</div>}
    {tab==="orders"&&<div className="table-responsive"><table className="table table-bordered table-hover align-middle"><thead><tr><th>Order</th><th>Customer</th><th>Phone</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>{data.orders.map(o=><tr key={o._id}><td>{o.orderNumber}</td><td>{o.customer?.name}<br/><small>{o.customer?.email}</small></td><td>{o.customer?.phone}</td><td>₹{o.total}</td><td>{o.paymentMethod} / {o.paymentStatus}</td><td><select className="form-select" value={o.status} onChange={e=>action(`/orders/${o._id}`,"PATCH",{status:e.target.value})}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></td><td>{new Date(o.createdAt).toLocaleString()}</td><td><button className="btn btn-sm btn-outline-danger" onClick={()=>{if(confirm("Delete this order?"))action(`/orders/${o._id}`,"DELETE");}}>Delete</button></td></tr>)}</tbody></table>{!data.orders.length&&<p>No orders found.</p>}</div>}
    {tab==="contacts"&&<div className="table-responsive"><table className="table table-bordered align-middle"><thead><tr><th>Name</th><th>Email</th><th>Subject / Message</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>{data.contacts.map(c=><tr key={c._id}><td>{c.name}</td><td>{c.email}</td><td>{c.subject}<hr className="my-1"/>{c.message}</td><td>{c.status}</td><td>{new Date(c.createdAt).toLocaleString()}</td><td><button className="btn btn-sm btn-success me-2" onClick={()=>action(`/contacts/${c._id}`,"PATCH",{status:c.status==="resolved"?"new":"resolved"})}>{c.status==="resolved"?"Reopen":"Resolve"}</button><button className="btn btn-sm btn-outline-danger" onClick={()=>action(`/contacts/${c._id}`,"DELETE")}>Delete</button></td></tr>)}</tbody></table>{!data.contacts.length&&<p>No contact messages.</p>}</div>}
    {tab==="feedback"&&<div className="table-responsive"><table className="table table-bordered align-middle"><thead><tr><th>Name</th><th>Email</th><th>Rating</th><th>Feedback</th><th>Date</th><th>Action</th></tr></thead><tbody>{data.feedback.map(f=><tr key={f._id}><td>{f.name}</td><td>{f.email}</td><td>{"⭐".repeat(f.rating)}</td><td>{f.message}</td><td>{new Date(f.createdAt).toLocaleString()}</td><td><button className="btn btn-sm btn-outline-danger" onClick={()=>action(`/feedback/${f._id}`,"DELETE")}>Delete</button></td></tr>)}</tbody></table>{!data.feedback.length&&<p>No feedback yet.</p>}</div>}
    {tab==="products"&&<div className="table-responsive"><table className="table table-bordered align-middle"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Active</th><th>Action</th></tr></thead><tbody>{data.products.map(p=><tr key={p._id}><td>{p.name}</td><td>{p.category}</td><td>₹{p.price}</td><td>{String(p.active!==false)}</td><td><button className="btn btn-sm btn-outline-success" onClick={()=>action(`/products/${p._id}`,"PATCH",{active:p.active===false})}>{p.active===false?"Enable":"Disable"}</button></td></tr>)}</tbody></table>{!data.products.length&&<p>No products found.</p>}</div>}
  </main>;
}
