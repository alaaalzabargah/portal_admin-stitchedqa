import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function applyMigration() {
    const dbUrl = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'postgresql://postgres:').replace('.supabase.co', ':5432/postgres');
    
    // Fallback if we don't have a direct connection string
    if (!process.env.DATABASE_URL) {
        console.log('No DATABASE_URL found. Please apply the migration manually via the Supabase Dashboard SQL Editor:');
        console.log('File: supabase/migrations/20260322165407_add_whatsapp_automations.sql');
        return;
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const sql = fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '20260322165407_add_whatsapp_automations.sql'), 'utf8');
        
        console.log('Applying migration...');
        await client.query(sql);
        console.log('✅ Migration applied successfully!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

applyMigration();
