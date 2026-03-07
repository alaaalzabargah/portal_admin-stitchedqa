const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('orders').select('id, shopify_order_number, status, financial_status, total_amount_minor, paid_amount_minor').order('created_at', { ascending: false }).limit(4);
  console.log(JSON.stringify(data, null, 2));
}
run();
