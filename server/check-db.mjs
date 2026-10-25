import { createDatabasePool, inspectDatabase, describeDatabaseError } from './db.mjs';
let pool;
try {
  pool = createDatabasePool();
  const result = await inspectDatabase(pool);
  console.log(`Connected to database: ${result.database}`);
  console.log(`hackloop schema exists: ${result.schema_exists}`);
  console.log(`Tables found: ${result.tables.length}`);
  console.log(result.tables.join(', '));
  const required = ['users', 'profiles', 'events', 'organizations', 'event_registrations'];
  const missing = required.filter(name => !result.tables.includes(name));
  if (missing.length) {
    console.error(`Missing required tables: ${missing.join(', ')}. No database changes were made.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(pool ? describeDatabaseError(error) : error.message);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
