/**
 * PATCH /api/reviews/[id]
 * Updates a review's status. Used by the moderation dashboard.
 * Valid transitions:
 *   NEEDS_ATTENTION → PUBLISHED   (approve)
 *   NEEDS_ATTENTION → ARCHIVED    (archive)
 *   PUBLISHED       → NEEDS_ATTENTION  (revoke)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error('Missing Supabase credentials');
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

const VALID_STATUSES = ['NEEDS_ATTENTION', 'PUBLISHED', 'ARCHIVED'] as const;
type ReviewStatus = typeof VALID_STATUSES[number];

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body as { status: ReviewStatus };

        if (!VALID_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
                { status: 400 }
            );
        }

        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('reviews')
            .update({ status })
            .eq('id', id)
            .select('id, status')
            .single();

        if (error) {
            console.error(`[PATCH /api/reviews/${id}] Database error:`, error.message);
            return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, review: data });
    } catch (err) {
        console.error('[PATCH /api/reviews/[id]] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
