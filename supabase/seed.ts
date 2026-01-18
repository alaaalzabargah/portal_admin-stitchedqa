import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

// Create a Supabase client with the SERVICE ROLE key (admin access)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function seed() {
    const email = 'admin@stitched.bh'; // Change this if needed
    const password = 'ChangeMe123!';
    const fullName = 'Admin User';

    console.log(`Creating user: ${email}...`);

    // 1. Create Auth User (Auto-confirmed)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    });

    if (authError) {
        console.error('Error creating auth user:', authError.message);
        return;
    }

    if (!authUser.user) {
        console.error('Auth user created but returned null data?');
        return;
    }

    console.log(`Auth user created (${authUser.user.id}). Creating portal_users entry...`);

    // 2. Create Portal User (Owner)
    const { error: profileError } = await supabase
        .from('portal_users')
        .insert({
            id: authUser.user.id,
            email: email,
            full_name: fullName,
            role: 'owner'
        });

    if (profileError) {
        console.error('Error creating portal_user:', profileError.message);
        // Cleanup auth user if profile fails
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return;
    }

    console.log('✅ Success! User seeded.');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

seed();
