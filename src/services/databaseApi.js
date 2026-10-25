// Browser code calls the local backend through Vite's /api proxy.
export async function checkDatabaseConnection() {
  const response = await fetch('/api/health/database', {cache:'no-store'});
  const data = await response.json();
  if (!response.ok && !data.connected) throw new Error(data.error || 'Database connection unavailable.');
  return data;
}

export async function fetchPublishedEvents() {
  const response = await fetch('/api/events');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load events.');
  return data.events;
}
