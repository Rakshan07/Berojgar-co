// ─── Auth API client (FastAPI backend) ───────────────────────────────────────
// Base URL comes from VITE_API_URL, default http://localhost:8000.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'teamweave_token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable */ }
}

async function request(path, { method = 'POST', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running on ' + API_URL + '?');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data?.detail) ? data.detail.map(d => d.msg).join(', ') : data?.detail;
    throw new Error(detail || 'Something went wrong. Please try again.');
  }
  return data;
}

export async function loginApi(email, password) {
  const { token, user } = await request('/auth/login', { body: { email, password } });
  setToken(token);
  return user;
}

export async function registerApi({ email, name, password, role }) {
  const { token, user } = await request('/auth/register', { body: { email, name, password, role } });
  setToken(token);
  return user;
}

export async function logoutApi() {
  try {
    await request('/auth/logout', { auth: true });
  } catch { /* token may already be invalid; clear it locally regardless */ }
  setToken(null);
}
