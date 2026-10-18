import { useEffect, useState } from "react";
import { FileSignature, Download, Loader2, Eye, UserPlus } from "lucide-react";
import API from "../../services/api";
import { useClientAuth } from "../../context/ClientAuthContext";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";

const cls="input-premium";
const empty={client_employee_id:"",candidate_name:"",candidate_email:"",position:"",department:"",salary_monthly:"",joining_date:"",work_mode:"WFO/WFH",internship_duration:"",working_days:"6 Days per Week",office_timings:"9:00 AM – 6:00 PM",lunch_break:"1:00 PM – 1:30 PM",notice_period:"1 Month",responsibilities:"",template:"standard"};

export default function OfferLetters(){
 const {client}=useClientAuth(); const isEmployee=client?.role==="CLIENT_EMPLOYEE";
 const [templates,setTemplates]=useState([]),[history,setHistory]=useState([]),[employees,setEmployees]=useState([]),[form,setForm]=useState(empty),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const load=async()=>{try{const calls=[API.get("/client/leave-offer/offers/templates"),API.get("/client/leave-offer/offers")];if(!isEmployee)calls.push(API.get("/client/employees"));const r=await Promise.all(calls);setTemplates(r[0].data.data||[]);setHistory(r[1].data.data||[]);if(!isEmployee)setEmployees(r[2].data.data||[])}catch(e){toast.error("Failed to load offer letters")}finally{setLoading(false)}};
 useEffect(()=>{load()},[isEmployee]);
 const chooseEmployee=(id)=>{const e=employees.find(x=>Number(x.id)===Number(id));setForm(f=>({...f,client_employee_id:id,candidate_name:e?.name||f.candidate_name,candidate_email:e?.email||f.candidate_email,department:e?.departmentName||f.department,position:e?.designationName||f.position,salary_monthly:e?.salary??f.salary_monthly,joining_date:e?.joiningDate?String(e.joiningDate).slice(0,10):f.joining_date}))};
 const getPdfUrl=async(id)=>{const r=await API.get(`/client/leave-offer/offers/${id}/pdf`,{responseType:"blob"});return URL.createObjectURL(r.data)};
 const download=async(id,name)=>{try{const u=await getPdfUrl(id);const a=document.createElement("a");a.href=u;a.download=`Offer-${String(name||"employee").replace(/[^a-z0-9]+/gi,"_")}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}catch(e){toast.error("Offer letter download failed")}};
 const viewOffer=async(id)=>{try{const u=await getPdfUrl(id);window.open(u,"_blank","noopener,noreferrer");setTimeout(()=>URL.revokeObjectURL(u),60000)}catch(e){toast.error("Unable to open offer letter")}};
 const generate=async e=>{e.preventDefault();setBusy(true);try{await API.post("/client/leave-offer/offers/generate",form,{responseType:"blob"}).then(r=>{const u=URL.createObjectURL(r.data);const a=document.createElement("a");a.href=u;a.download=`Offer-${form.candidate_name.replace(/[^a-z0-9]+/gi,"_")}.pdf`;a.click();URL.revokeObjectURL(u)});toast.success("Offer letter generated successfully");setForm(empty);load()}catch(e){toast.error(e?.response?.data?.message||"Offer generation failed")}finally{setBusy(false)}};
 return <div className="space-y-6 animate-fadeUp">
  <PageHeader icon={FileSignature} title="Offer Letters" subtitle={isEmployee?"View and download your assigned offer letter.":"Generate professional offer letters using the Ardhnarishwar-branded five-page format."}/>
  {!isEmployee&&<form onSubmit={generate} className="card-premium p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
    <select className={cls} value={form.client_employee_id} onChange={e=>chooseEmployee(e.target.value)}><option value="">Select existing employee (optional)</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name} {e.employeeCode?`(${e.employeeCode})`:""}</option>)}</select>
    <select className={cls} value={form.template} onChange={e=>setForm({...form,template:e.target.value})}>{templates.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select>
    <input required className={cls} placeholder="Candidate / Employee name" value={form.candidate_name} onChange={e=>setForm({...form,candidate_name:e.target.value})}/>
    <input type="email" className={cls} placeholder="Email" value={form.candidate_email} onChange={e=>setForm({...form,candidate_email:e.target.value})}/>
    <input required className={cls} placeholder="Position / Designation" value={form.position} onChange={e=>setForm({...form,position:e.target.value})}/>
    <input className={cls} placeholder="Department" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/>
    <input type="number" min="0" className={cls} placeholder="Monthly salary (₹)" value={form.salary_monthly} onChange={e=>setForm({...form,salary_monthly:e.target.value})}/>
    <input required type="date" className={cls} value={form.joining_date} onChange={e=>setForm({...form,joining_date:e.target.value})}/>
    <select className={cls} value={form.work_mode} onChange={e=>setForm({...form,work_mode:e.target.value})}><option>WFO/WFH</option><option>Work From Office</option><option>Work From Home</option><option>Hybrid</option></select>
    <input className={cls} placeholder="Internship / evaluation duration" value={form.internship_duration} onChange={e=>setForm({...form,internship_duration:e.target.value})}/>
    <input className={cls} placeholder="Working days" value={form.working_days} onChange={e=>setForm({...form,working_days:e.target.value})}/>
    <input className={cls} placeholder="Office timings" value={form.office_timings} onChange={e=>setForm({...form,office_timings:e.target.value})}/>
    <input className={cls} placeholder="Lunch break" value={form.lunch_break} onChange={e=>setForm({...form,lunch_break:e.target.value})}/>
    <input className={cls} placeholder="Notice period" value={form.notice_period} onChange={e=>setForm({...form,notice_period:e.target.value})}/>
    <textarea className={`${cls} md:col-span-2 lg:col-span-3`} rows={4} placeholder="Roles & responsibilities (optional)" value={form.responsibilities} onChange={e=>setForm({...form,responsibilities:e.target.value})}/>
    <button disabled={busy} className="btn-primary md:col-span-2 lg:col-span-3">{busy?<Loader2 className="animate-spin" size={16}/>:<Download size={16}/>} {busy?"Generating...":"Generate & Download PDF"}</button>
  </form>}
  <div className="card-premium overflow-hidden"><div className="p-5 border-b border-slate-100 flex items-center gap-2"><UserPlus size={18} className="text-indigo-600"/><div><h2 className="font-bold text-slate-900">{isEmployee?"My Offer Letters":"Generated Offer Letters"}</h2><p className="text-xs text-slate-400">{history.length} document{history.length===1?"":"s"}</p></div></div>
   {loading?<div className="p-10 text-center text-slate-400">Loading...</div>:history.length===0?<div className="p-12 text-center text-slate-400">No offer letter found.</div>:<div className="divide-y divide-slate-100">{history.map(o=><div key={o.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><p className="font-semibold text-slate-900">{o.candidate_name}</p><p className="text-sm text-slate-500">{o.position} {o.department?`• ${o.department}`:""}</p><p className="text-xs text-slate-400 mt-1">Joining: {String(o.joining_date).slice(0,10)} • Generated: {new Date(o.created_at).toLocaleDateString("en-IN")}</p></div><div className="flex gap-2"><button onClick={()=>download(o.id,o.candidate_name)} className="btn-primary btn-inline"><Download size={15}/> Download PDF</button><button onClick={()=>viewOffer(o.id)} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold"><Eye size={15}/> View</button></div></div>)}</div>}
  </div>
 </div>
}
