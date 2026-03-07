const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('shopify_order_events').select('topic, event_data, raw_payload').eq('shopify_order_id', '4626569101377').order('created_at', { ascending: true });
  console.log(JSON.stringify(data?.map(d => ({ topic: d.topic, data: d.event_data, lineItemsHasProps: d.raw_payload?.line_items?.[0]?.properties ? true : false })), null, 2));
}
run();
