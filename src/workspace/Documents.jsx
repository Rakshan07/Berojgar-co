import { downloadDocument } from './documentDownload';
import { useState } from 'react';
import { request, useResource } from './api';
export default function Documents({ required=false }) {
  const resource=useResource('/profiles/me/documents');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const categories=required?[['affiliation','University / organization affiliation proof'],['authorization','Authorization to organize on behalf of your organization'],['qualification','Qualifications or credentials'],['supporting','Additional documents or photographs (optional)']]:[['supporting','Documents or certificates (optional)']];
  async function upload(event,category){
    const file=event.target.files?.[0];if(!file)return;
    if(file.size>5*1024*1024){setError('Each file must be 5 MB or smaller.');event.target.value='';return;}
    setBusy(true);setError('');
    try{await request(`/profiles/me/documents?category=${category}&filename=${encodeURIComponent(file.name)}`,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});resource.reload();}catch(err){setError(err.message);}finally{setBusy(false);event.target.value='';}
  }
  async function remove(id){setBusy(true);setError('');try{await request(`/profiles/me/documents/${id}`,{method:'DELETE'});resource.reload();}catch(err){setError(err.message);}finally{setBusy(false);}}
  return <section className="tw-panel"><div className="tw-panelhead"><div><h2>{required?'Verification documents':'Your documents'}</h2><p>{required?'Upload a document for each of the three required categories.':'Uploads are optional and do not prevent you from continuing.'} PDF, JPEG or PNG. Up to 5 MB each and 10 files total. Files are private to you and administrators.</p></div></div><div className="tw-formpanel">
    {categories.map(([category,label])=><label key={category} className="tw-field"><span>{label}{required&&category!=='supporting'?' *':''}</span><input type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy} onChange={e=>upload(e,category)}/></label>)}
    {busy&&<p role="status">Saving document changes…</p>}{(error||resource.error)&&<p role="alert">{error||resource.error}</p>}
    <ul>{resource.data?.map(doc=><li key={doc.id} style={{marginBottom:12}}>{doc.filename} · {doc.category} <button type="button" className="tw-textbutton" onClick={()=>downloadDocument(doc.id).catch(err=>setError(err.message))}>Download</button> <button type="button" className="tw-textbutton" disabled={busy} onClick={()=>remove(doc.id)}>Remove</button></li>)}</ul>
  </div></section>;
}
