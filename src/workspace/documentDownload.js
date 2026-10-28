import { API_BASE } from './api';
export async function downloadDocument(id) {
  const response=await fetch(`${API_BASE}/documents/${id}`,{headers:{Authorization:`Bearer ${localStorage.getItem('teamweave_token')}`}});
  if(!response.ok)throw new Error('Unable to download this document.');
  const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='document.'+({'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'}[blob.type]||'bin');link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
