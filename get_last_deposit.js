const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('shopify_order_number, raw_payload')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  const depositOrder = orders.find(o => {
    if (!o.raw_payload || !o.raw_payload.line_items) return false;
    // Look for a deposit item which has either title "Deposit" or components
    return o.raw_payload.line_items.some(item => 
      (item.title && item.title.includes('Deposit')) || 
      (item.components && item.components.length > 0)
    );
  });

  if (depositOrder) {
    console.log(`Found deposit order: #${depositOrder.shopify_order_number}`);
    const items = depositOrder.raw_payload.line_items;
    items.forEach((item, index) => {
      console.log(`\n--- Item ${index + 1}: ${item.title} ---`);
      if (item.properties && item.properties.length > 0) {
        console.log(`Parent properties (${item.properties.length}):`, JSON.stringify(item.properties, null, 2));
      } else {
        console.log('Parent properties: []');
      }
      
      if (item.components && item.components.length > 0) {
        console.log(`\nComponents (${item.components.length}):`);
        item.components.forEach((comp, cIdx) => {
          console.log(`  Component ${cIdx + 1}: ${comp.title}`);
          console.log(`  Component properties:`, JSON.stringify(comp.properties, null, 2));
        });
      } else {
        console.log('\nComponents: None');
      }
    });
  } else {
    console.log('No recent deposit orders found in the last 20 orders.');
  }
}
run();
