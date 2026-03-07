const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('webhook_events').select('topic, payload, created_at').order('created_at', { ascending: false }).limit(20);
  
  if (data) {
    const orders = data.filter(d => d.topic === 'orders/create' || d.topic === 'orders/paid');
    orders.forEach(d => {
      let orderNum = d.payload?.order_number;
      let props = null;
      if (d.payload && d.payload.line_items && d.payload.line_items.length > 0) {
        props = d.payload.line_items[0].properties;
      }
      console.log(`Order ${orderNum} | Topic: ${d.topic} | Time: ${d.created_at} | Props exist? ${!!props} | Props length: ${props?.length}`);
    });
  } else {
    console.log('Error', error);
  }
}
run();
