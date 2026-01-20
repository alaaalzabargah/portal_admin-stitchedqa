/**
 * Script to add +974 country code to existing Qatar phone numbers
 * Run with: npx tsx scripts/fix-phone-country-codes.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fixPhoneCountryCodes() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Finding customers with phone numbers missing country code...\n');

    // Get all customers with phone numbers that don't start with +
    const { data: customers, error } = await supabase
        .from('customers')
        .select('id, full_name, phone')
        .not('phone', 'is', null)
        .not('phone', 'like', '+%');

    if (error) {
        console.error('❌ Error fetching customers:', error);
        process.exit(1);
    }

    if (!customers || customers.length === 0) {
        console.log('✅ All customers already have country codes!');
        return;
    }

    console.log(`📋 Found ${customers.length} customers to update:\n`);

    let updated = 0;
    let skipped = 0;

    for (const customer of customers) {
        const oldPhone = customer.phone;

        // Skip invalid phones
        if (!oldPhone || oldPhone.toLowerCase().includes('shop') || oldPhone.includes('@')) {
            console.log(`⏭️  Skipping invalid: ${customer.full_name} - ${oldPhone}`);
            skipped++;
            continue;
        }

        // Remove leading zeros and add +974
        const cleanedPhone = oldPhone.replace(/^0+/, '');
        const newPhone = `+974${cleanedPhone}`;

        console.log(`📱 ${customer.full_name}: ${oldPhone} → ${newPhone}`);

        // Update the customer
        const { error: updateError } = await supabase
            .from('customers')
            .update({ phone: newPhone })
            .eq('id', customer.id);

        if (updateError) {
            console.error(`   ❌ Failed to update: ${updateError.message}`);
        } else {
            updated++;
        }
    }

    console.log(`\n✅ Done! Updated ${updated} customers, skipped ${skipped} invalid phones.`);
}

// Run the script
fixPhoneCountryCodes().catch(console.error);
