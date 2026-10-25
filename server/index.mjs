import http from 'node:http';
import { createDatabasePool, inspectDatabase, describeDatabaseError } from './db.mjs';

let pool;
try { pool = createDatabasePool(); }
catch (error) { console.error(error.message); process.exit(1); }
pool.on('error', error => console.error(describeDatabaseError(error)));

function send(res, code, value) {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(value));
}

const server = http.createServer(async (req, res) => {
  // Local development only. No permissive CORS or browser database credentials.
  const host = (req.headers.host || '').split(':')[0];
  if (!['localhost', '127.0.0.1'].includes(host)) return send(res, 403, {error:'Unrecognized host'});
  if (req.headers.origin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin)) {
    return send(res, 403, {error:'Unrecognized origin'});
  }
  if (req.method !== 'GET') return send(res, 405, {error:'Method not allowed'});
  const pathname = new URL(req.url, 'http://localhost').pathname;
  try {
    if (pathname === '/api/health') return send(res, 200, {status:'ok'});
    if (pathname === '/api/health/database') {
      const result = await inspectDatabase(pool);
      const ready = result.schema_exists && ['users','profiles','events','organizations','event_registrations'].every(name => result.tables.includes(name));
      return send(res, ready ? 200 : 503, {
        connected:true, schemaReady:ready, tableCount:result.tables.length,
        message:ready ? 'PostgreSQL connection and core schema verified.' : 'Connected, but the required hackloop schema/tables are missing.'
      });
    }
    if (pathname === '/api/events') {
      const {rows} = await pool.query(`
        SELECT e.id, e.title, e.slug, e.description, e.category, e.event_mode,
               e.starts_at, e.ends_at, e.registration_closes_at,
               e.min_team_size, e.max_team_size, e.cover_image_url,
               o.name AS organizer_name
        FROM hackloop.events e
        JOIN hackloop.organizations o ON o.id = e.organization_id
        WHERE e.status = 'published'
        ORDER BY e.starts_at, e.id
        LIMIT 100
      `);
      return send(res, 200, {events:rows});
    }
    return send(res, 404, {error:'Not found'});
  } catch (error) {
    console.error(describeDatabaseError(error));
    return send(res, 503, {connected:false, error:'Database unavailable or schema not ready. Run npm run db:check in the server terminal.'});
  }
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'API port is already in use. Stop the old server or change API_PORT and the Vite proxy together.' : 'API could not start.');
  pool.end().finally(() => process.exit(1));
});
server.listen(Number(process.env.API_PORT || 3001), '127.0.0.1', () => console.log('Local API listening at http://127.0.0.1:' + (process.env.API_PORT || 3001)));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => {
  server.close(async () => { await pool.end(); process.exit(0); });
  server.closeIdleConnections();
});
