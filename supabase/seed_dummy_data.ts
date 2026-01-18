import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase URL or Service Role Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const DUMMY_CUSTOMERS = [
    {
        full_name: "Al Anoud Al Thani (العنود آل ثاني)",
        phone: "+97455001122",
        email: "alanoud.althani@example.com",
        status_tier: "VIP",
        tags: ["Royal", "Bisht Style", "Rush Order"],
        notes: "Prefers deep black crepe. Always requests swift delivery. (تفضل الكريب الأسود الغامق. تطلب دائمًا توصيل سريع.)",
        marketing_opt_in: true,

    },
    {
        full_name: "Fatima Al Kuwari (فاطمة الكواري)",
        phone: "+97466112233",
        email: "fatima.k@example.com",
        status_tier: "Gold",
        tags: ["Embroidery Lover", "Eid Collection"],
        notes: "Likes heavy embroidery on sleeves. (تحب التطريز الكثيف على الأكمام.)",
        marketing_opt_in: true,

    },
    {
        full_name: "Sarah Smith (سارة سميث)",
        phone: "+97433445566",
        email: "sarah.smith@example.com",
        status_tier: "Normal",
        tags: ["New Customer", "English Speaking"],
        notes: "First time buyer. Interested in linen fabrics. (مشتري لأول مرة. مهتمة بأقمشة الكتان.)",
        marketing_opt_in: false,

    },
    {
        full_name: "Sheikha Moza (شيخة موزة)",
        phone: "+97477889900",
        email: "moza.vip@example.com",
        status_tier: "VIP",
        tags: ["High Spender", "Custom Design"],
        notes: "Requires personal consultation for every order. (تتطلب استشارة شخصية لكل طلب.)",
        marketing_opt_in: true,

    },
    {
        full_name: "Noor Al Hamad (نور الحمد)",
        phone: "+97433221100",
        email: "noor.h@example.com",
        status_tier: "Gold",
        tags: ["Office Wear", "Simple Cuts"],
        notes: "Prefers simple cuts for work. (تفضل القصات البسيطة للعمل.)",
        marketing_opt_in: true,

    }
];

async function seedDummyData() {
    console.log('🌱 Seeding Dummy Data...');

    for (const customerData of DUMMY_CUSTOMERS) {
        // 1. Create Customer
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .upsert({
                full_name: customerData.full_name,
                phone: customerData.phone,
                email: customerData.email,
                status_tier: customerData.status_tier,
                tags: customerData.tags,
                notes: customerData.notes,
                marketing_opt_in: customerData.marketing_opt_in,
                total_spend_minor: Math.floor(Math.random() * 500000), // Random spend 0-5000 QAR
                order_count: Math.floor(Math.random() * 10),
            }, { onConflict: 'phone' })
            .select()
            .single();

        if (customerError) {
            console.error(`Error creating customer ${customerData.full_name}:`, customerError.message);
            continue;
        }

        console.log(`✅ Created/Updated Customer: ${customer.full_name}`);





        // 3. Create Random Orders (Optional for realism)
        const numOrders = Math.floor(Math.random() * 3);
        for (let i = 0; i < numOrders; i++) {
            await supabase.from('orders').insert({
                customer_id: customer.id,
                source: ['shopify', 'whatsapp', 'walk_in'][Math.floor(Math.random() * 3)],
                status: ['completed', 'shipped', 'pending'][Math.floor(Math.random() * 3)],
                total_amount_minor: Math.floor(Math.random() * 100000) + 50000,
                currency: 'QAR'
            });
        }
    }

    console.log('✨ Dummy data seeding complete!');
}

seedDummyData().catch(console.error);
