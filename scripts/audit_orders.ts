import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function auditOrder(orderNum: number) {
  const { data: order } = await supabase
    .from('orders')
    .select('id, shopify_order_number, total_amount_minor, paid_amount_minor, financial_status, raw_payload')
    .eq('source', 'shopify')
    .eq('shopify_order_number', String(orderNum))
    .single()

  if (!order) { console.log(`#${orderNum}: SKIPPED (not found)`); return }

  const p = order.raw_payload as any
  if (!p?.line_items) { console.log(`#${orderNum}: SKIPPED (no payload)`); return }

  const all = p.line_items as any[]
  const removed = all.filter((i: any) => i.current_quantity === 0)
  const active = all.filter((i: any) => i.current_quantity !== 0)

  const { data: dbItems } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', order.id)

  const dbCount = dbItems?.length || 0
  const edited = p.current_total_price && String(p.current_total_price) !== String(p.total_price)

  const flags: string[] = []
  if (removed.length > 0) flags.push(`GHOST_ITEMS(${removed.length})`)
  if (dbCount !== active.length) flags.push(`DB_MISMATCH(db:${dbCount} vs active:${active.length})`)
  if (edited) flags.push(`EDITED(orig:${p.total_price} curr:${p.current_total_price} db:${order.total_amount_minor / 100})`)

  if (flags.length > 0) {
    console.log(`#${orderNum}: ⚠️  ${flags.join(' | ')}`)
  } else {
    console.log(`#${orderNum}: ✅ OK (items:${active.length}, db:${dbCount}, total:${order.total_amount_minor / 100})`)
  }
}

async function main() {
  const start = parseInt(process.argv[2] || '1196')
  const end = parseInt(process.argv[3] || '1205')
  console.log(`Auditing orders #${start} to #${end}...\n`)
  for (let i = start; i <= end; i++) {
    await auditOrder(i)
  }
  console.log('\nDone!')
}

main()
