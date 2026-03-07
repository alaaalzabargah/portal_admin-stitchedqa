const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('orders').select('shopify_order_number, raw_payload').eq('shopify_order_number', '1170').single();
  
  if (data && data.raw_payload && data.raw_payload.line_items) {
    const items = data.raw_payload.line_items;
    console.log(`Order 1170 has ${items.length} line items in its raw payload.`);
    items.forEach((item, index) => {
      console.log(`Item ${index} properties:`, JSON.stringify(item.properties, null, 2));
    });
  } else {
    console.log('No line items found or no raw payload:', error || data);
  }
}
run();
