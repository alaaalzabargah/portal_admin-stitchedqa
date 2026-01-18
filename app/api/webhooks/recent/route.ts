/**
 * Recent Webhooks API Endpoint
 * 
 * GET /api/webhooks/recent - List recent webhook events from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Parse query params
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        // Get recent webhook events
        const { data, error } = await supabase
            .from('webhook_events')
            .select('*')
            .order('received_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Recent webhooks API error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform for display
        const webhooks = (data || []).map((event: any) => ({
            id: event.id,
            topic: event.topic,
            resourceId: event.resource_id,
            payloadHash: event.payload_hash,
            status: event.status,
            errorMessage: event.error_message,
            body: event.raw_payload,
            receivedAt: event.received_at,
            processedAt: event.processed_at,
            hmacValid: true, // If it's in the DB, HMAC was valid
        }));

        return NextResponse.json({ webhooks });

    } catch (err) {
        console.error('Recent webhooks API exception:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
