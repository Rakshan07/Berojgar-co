import { useState } from 'react';
import { Link } from 'react-router-dom';
import { checkDatabaseConnection, fetchPublishedEvents } from '../../services/databaseApi';

export default function DatabaseConnectionPage() {
  const [status, setStatus] = useState('Not checked');
  const [events, setEvents] = useState(null);
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true); setEvents(null);
    try {
      const result = await checkDatabaseConnection();
      setStatus(result.message);
      if (result.schemaReady) setEvents(await fetchPublishedEvents());
    } catch (error) { setStatus(error.message.includes('JSON') ? 'Start the backend with npm run dev:api, then try again.' : error.message); }
    finally { setBusy(false); }
  }
  return <main style={{maxWidth:760, margin:'60px auto', padding:24}}>
    <Link to="/">← Back to website</Link>
    <h1 style={{fontSize:30,marginTop:24}}>Local database connection</h1>
    <p>This development check reads real PostgreSQL data through the backend.</p>
    <button onClick={check} disabled={busy} style={{margin:'24px 0',padding:'12px 20px',background:'#9672B7',color:'white',borderRadius:8}}>{busy ? 'Checking…' : 'Check database connection'}</button>
    <p role="status">{status}</p>
    {events && <section style={{marginTop:24}}><h2>Published events ({events.length})</h2>
      {events.length === 0 ? <p>No published events exist in the database. No sample records were inserted.</p> : <ul>{events.map(event=><li key={event.id}>{event.title} — {event.organizer_name}</li>)}</ul>}
    </section>}
    <p style={{marginTop:32}}>The existing dashboards and login still use demo/localStorage behavior. This connection check does not migrate those features or authenticate users.</p>
  </main>;
}
