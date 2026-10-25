import pg from 'pg';

export function createDatabasePool() {
  if (!process.env.PGPASSWORD || process.env.PGPASSWORD === 'REPLACE_LOCALLY') {
    throw new Error('Set PGPASSWORD in the gitignored .env file. Never paste it into chat.');
  }
  return new pg.Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'hackloop',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 5000,
    application_name: 'hackloop-local-api',
  });
}

export async function inspectDatabase(pool) {
  const result = await pool.query(`
    SELECT current_database() AS database,
           EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'hackloop') AS schema_exists,
           ARRAY(SELECT table_name::text FROM information_schema.tables
                 WHERE table_schema = 'hackloop' AND table_type = 'BASE TABLE'
                 ORDER BY table_name) AS tables
  `);
  return result.rows[0];
}

export function describeDatabaseError(error) {
  switch (error.code) {
    case '28P01': return 'PostgreSQL rejected the username/password. Update the local .env file.';
    case '3D000': return 'Database hackloop was not found. Verify PGDATABASE in .env.';
    case 'ECONNREFUSED': return 'PostgreSQL is not reachable at the configured host and port.';
    case '42501': return 'The database account does not have permission for this query.';
    case '42P01': return 'The required table is missing. Check whether the schema SQL completed successfully.';
    case '42703': return 'The database columns differ from the supplied schema. Reconcile migrations before proceeding.';
    default: return 'Database verification failed. Check PostgreSQL availability and the server-side configuration.';
  }
}
