// Only a disposable PostgreSQL database may receive these synthetic fixtures.
import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
if (process.env.QLINE_TEST_DATABASE !== 'true') throw new Error('Set QLINE_TEST_DATABASE=true only for a disposable test database.');
const client = new pg.Client();
try {
  await client.connect();
  if (process.argv.includes('--bootstrap')) {
    const { rows } = await client.query("select exists(select 1 from pg_tables where schemaname in ('public','auth')) as occupied");
    if (rows[0].occupied) throw new Error('Bootstrap requires an empty disposable database.');
    await client.query(await readFile(new URL('../Backend/integration/auth-schema.sql', import.meta.url), 'utf8'));
    const directory = new URL('../Backend/supabase/migrations/', import.meta.url);
    for (const file of (await readdir(directory)).filter(f => f.endsWith('.sql')).sort()) {
      await client.query('begin');
      try { await client.query(await readFile(new URL(file, directory), 'utf8')); await client.query('commit'); }
      catch (error) { await client.query('rollback'); throw error; }
      console.log('Applied to disposable database:', file);
    }
  }
  await client.query(await readFile(new URL('../Backend/test/rls.integration.sql', import.meta.url), 'utf8'));
  console.log('PostgreSQL RLS, consent and lifecycle checks passed; fixtures rolled back.');
} finally { await client.end(); }
