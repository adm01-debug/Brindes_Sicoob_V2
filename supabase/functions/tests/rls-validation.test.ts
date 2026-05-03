import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.test("RLS Policy Validation", async () => {
  // Check if policies exist for key tables
  const { data: policies, error } = await supabase.rpc('get_policies_summary');
  
  if (error) {
     // If the RPC doesn't exist, we use a raw query
     const { data: rawPolicies, error: rawError } = await supabase.from('pg_policies').select('*').in('tablename', ['sicoob_orders', 'order_comments', 'export_jobs']);
     if (rawError) throw rawError;
     
     const tablePolicies = rawPolicies.reduce((acc: any, p: any) => {
       acc[p.tablename] = acc[p.tablename] || [];
       acc[p.tablename].push(p.policyname);
       return acc;
     }, {});

     assert(tablePolicies['sicoob_orders']?.includes('sicoob_orders_select'), "sicoob_orders_select policy missing");
     assert(tablePolicies['order_comments']?.includes('order_comments_select'), "order_comments_select policy missing");
     assert(tablePolicies['export_jobs']?.includes('Users can view their own export jobs'), "export_jobs policies missing");
  }
});

Deno.test("Helper Functions Existence", async () => {
  const { data, error } = await supabase.rpc('check_function_exists', { func_name: 'is_vendedor' });
  // If rpc doesn't exist, we use direct query
  const { data: funcData } = await supabase.from('pg_proc').select('proname').eq('proname', 'is_vendedor').single();
  assert(funcData, "is_vendedor function missing");
});
