import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { handleOrderCreate } from '../lib/webhooks/shopify/handlers'

dotenv.config({ path: '.env.local' })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  validationFailed: console.error
}

async function fixOrder(orderNum: number) {
  const { data: order } = await supabase
    .from('orders')
    .select('id, raw_payload')
    .eq('shopify_order_number', String(orderNum))
    .single()

  if (!order?.raw_payload) {
    console.log(`Order #${orderNum} not found`)
    return
  }

  console.log(`\nRe-processing order #${orderNum}...`)
  const result = await handleOrderCreate(order.raw_payload, `fix_${orderNum}`, logger as any)
  console.log('Result:', result)

  const { data: totals } = await supabase
    .from('orders')
    .select('total_amount_minor, paid_amount_minor')
    .eq('shopify_order_number', String(orderNum))
    .single()
  console.log('Fixed totals:', totals)

  const { data: items } = await supabase
    .from('order_items')
    .select('product_name, unit_price_minor, shopify_line_item_id')
    .eq('order_id', order.id)
  console.log('Items:', items)
}

// Pass order numbers as arguments: npx tsx scripts/fix_order.ts 1181 1197
async function main() {
  const orderNums = process.argv.slice(2).map(Number)
  if (orderNums.length === 0) {
    console.log('Usage: npx tsx scripts/fix_order.ts <order_number> [order_number...]')
    return
  }
  for (const num of orderNums) {
    await fixOrder(num)
  }
  console.log('\nAll done!')
}

main()
