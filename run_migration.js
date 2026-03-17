require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!dbUrl) throw new Error('Missing DB URL');

  const client = new Client({
    connectionString: dbUrl,
  });

  await client.connect();
  const sql = fs.readFileSync('supabase/migrations/20260315_add_is_test_to_orders.sql', 'utf8');
  await client.query(sql);
  console.log("Migration applied successfully!");
  await client.end();
}
main().catch(console.error);
