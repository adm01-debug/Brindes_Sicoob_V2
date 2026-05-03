import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Since PostgREST doesn't expose pg_policies by default,
 * we verify policies by trying to access tables.
 * In a real test environment, we would use a non-service role key.
 * Here we just verify the structure is ready.
 */
Deno.test("Database Structure Validation", async () => {
  // Check if tables exist
  const { data: tables, error } = await supabase
    .from('export_jobs')
    .select('id')
    .limit(1);
  
  assert(!error || error.code !== '42P01', "export_jobs table missing");

  const { data: audit, error: auditError } = await supabase
    .from('export_audit_log')
    .select('id')
    .limit(1);
  
  assert(!auditError || auditError.code !== '42P01', "export_audit_log table missing");
});

Deno.test("Notification Preferences Validation", async () => {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .limit(1);
  
  assert(!error, `Failed to query notification_preferences: ${error?.message}`);
});

