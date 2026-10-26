import { useEffect, useState } from 'react';
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export async function request(path, options = {}) {
  const token = localStorage.getItem('teamweave_token');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!response.ok) {
    const message = response.status === 401 ? 'Please sign in again to load your account.' : response.status === 403 ? 'Your account does not have permission for this action.' : `This information could not be loaded (HTTP ${response.status}). Please try again.`;
    let detail; try { detail = (await response.json()).detail; } catch { /* Non-JSON response. */ }
    throw new Error(typeof detail === 'string' && response.status < 500 ? detail : message);
  }
  return response.status === 204 ? null : response.json();
}
export function useResource(path, enabled = true) {
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (!enabled) return;
    request(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setResult({ path, revision, data, loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ path, revision, data: null, loading: false, error: error instanceof TypeError ? 'Unable to reach the server. Please try again shortly.' : error.message });
    });
    return () => controller.abort();
  }, [path, enabled, revision]);
  const current = !enabled ? { data: null, loading: false, error: '' } : result?.path === path && result?.revision === revision ? result : { data: null, loading: true, error: '' };
  return { ...current, reload: () => setRevision(n => n + 1) };
}
export const categories = [
  ['hackathon','Hackathons'], ['coding_competition','Coding competitions'], ['ai_coding','AI coding'], ['ai_ml','AI & machine learning'], ['robotics','Robotics'], ['iot','IoT challenges'], ['technical_quiz','Technical quizzes'], ['startup_pitch','Startup pitches'], ['debate','Debate'], ['music','Music'], ['esports','Esports'], ['web_development','Web development'], ['mobile_development','Mobile development'], ['data_science','Data science'], ['cybersecurity','Cybersecurity'], ['project_exhibition','Project exhibitions'], ['research_presentation','Research presentations'], ['other','Other team events'],
];
export function eventDate(value) { const date = new Date(value); return !value || Number.isNaN(date.getTime()) ? 'Date to be announced' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
export function categoryName(event) { return event.category_name || categories.find(([id]) => id === (event.category_id || event.category))?.[1] || event.category_id || event.category || 'Team event'; }
