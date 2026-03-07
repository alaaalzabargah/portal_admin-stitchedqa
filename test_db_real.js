const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { ShopifyOrderSchema } = require('./lib/webhooks/shopify/schemas');
const { extractDepositAmount } = require('./lib/webhooks/shopify/extractors');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('webhook_events').select('topic, raw_payload').eq('topic', 'orders/paid').order('created_at', { ascending: false }).limit(2);
  
  if (data && data.length > 0) {
    for (const event of data) {
      if (event.raw_payload.order_number !== 1170) continue;
      
      const parsed = ShopifyOrderSchema.safeParse(event.raw_payload);
      if (!parsed.success) {
        console.log('Zod Parse Failed:', parsed.error.message);
        continue;
      }
      
      const order = parsed.data;
      const depositAmount = extractDepositAmount(order.line_items);
      const isDeposit = depositAmount > 0;
      
      console.log('Order 1170 isDeposit:', isDeposit, 'depositAmount:', depositAmount);
    }
  }
}
run();
