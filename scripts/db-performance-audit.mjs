import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables for DB EXPLAIN script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TABLES_TO_EXPLAIN = [
  'quotes',
  'quote_items',
  'orders',
  'order_items',
  'profiles',
  'workspace_notifications'
];

async function runExplain() {
  console.log('--- 📊 DATABASE PERFORMANCE AUDIT (EXPLAIN ANALYZE) ---');
  
  for (const table of TABLES_TO_EXPLAIN) {
    console.log(`\nTable: ${table}`);
    try {
      // Usamos uma query RPC para rodar EXPLAIN do lado do banco
      const { data, error } = await supabase.rpc('inspect_query_plan', { 
        p_query: `SELECT * FROM ${table} LIMIT 100` 
      });
      
      if (error) {
        console.error(`Error explaining ${table}:`, error.message);
      } else {
        console.log(data);
      }
    } catch (err) {
      console.error(`Unexpected error for ${table}:`, err);
    }
  }
}

runExplain();
