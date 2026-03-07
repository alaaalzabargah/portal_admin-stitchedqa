const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: order } = await supabase.from('orders').select('shopify_order_id').eq('shopify_order_number', '1170').single();
  const shopifyId = order.shopify_order_id;
  const { data, error } = await supabase.from('shopify_order_events').select('topic, raw_payload').eq('shopify_order_id', shopifyId).order('created_at', { ascending: true });
  
  if (data) {
    data.forEach(d => {
      let props = null;
      if (d.raw_payload && d.raw_payload.line_items && d.raw_payload.line_items.length > 0) {
        props = d.raw_payload.line_items[0].properties;
      }
      console.log(`Topic: ${d.topic}, Props:`, props ? JSON.stringify(props).substring(0, 100) : 'None');
    });
  } else {
    console.log('No events', error);
  }
}
run();
