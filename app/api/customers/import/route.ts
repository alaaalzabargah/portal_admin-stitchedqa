/**
 * Bulk Customer Import API
 * POST /api/customers/import
 * Accepts Excel file and imports customers
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { DEFAULT_TIER } from '@/lib/loyalty/constants'

interface ImportRow {
    full_name?: string
    phone?: string
    email?: string
    notes?: string
    height_cm?: number | string
    shoulder_width_cm?: number | string
    bust_cm?: number | string
    waist_cm?: number | string
    hips_cm?: number | string
    sleeve_length_cm?: number | string
    product_length_cm?: number | string
    arm_hole_cm?: number | string
    measurement_type?: string
    standard_size?: string
}

interface ImportResult {
    success: boolean
    total: number
    imported: number
    skipped: number
    errors: Array<{ row: number; phone?: string; error: string }>
    logs: string[]
}

function normalizePhone(phone: string | undefined): string | null {
    if (!phone) return null
    // Remove all non-digit characters
    const cleaned = String(phone).replace(/\D/g, '')
    // Ensure it's a reasonable length
    if (cleaned.length < 8 || cleaned.length > 15) return null
    return cleaned
}

function parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null
    const num = parseFloat(String(value))
    return isNaN(num) ? null : num
}

export async function POST(request: NextRequest) {
    const result: ImportResult = {
        success: false,
        total: 0,
        imported: 0,
        skipped: 0,
        errors: [],
        logs: []
    }

    try {
        const supabase = await createClient()

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check user role
        const { data: profile } = await supabase
            .from('portal_users')
            .select('role, is_active')
            .eq('id', user.id)
            .single()

        if (!profile || !profile.is_active || !['owner', 'admin', 'manager', 'editor'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        result.logs.push(`[${new Date().toISOString()}] Import started by ${user.email}`)
        result.logs.push(`[${new Date().toISOString()}] Default tier: ${DEFAULT_TIER.name}`)

        // Get the file from form data
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        result.logs.push(`[${new Date().toISOString()}] File received: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)

        // Read file as buffer
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })

        // Get first sheet
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
            return NextResponse.json({ error: 'No sheet found in workbook' }, { status: 400 })
        }

        result.logs.push(`[${new Date().toISOString()}] Reading sheet: ${sheetName}`)

        const sheet = workbook.Sheets[sheetName]
        const rows: ImportRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        result.total = rows.length
        result.logs.push(`[${new Date().toISOString()}] Found ${rows.length} rows to process`)

        if (rows.length === 0) {
            return NextResponse.json({ error: 'No data rows found', result }, { status: 400 })
        }

        // Get existing phones to check for duplicates
        const phones = rows
            .map(r => normalizePhone(r.phone))
            .filter(p => p !== null) as string[]

        const { data: existingCustomers } = await supabase
            .from('customers')
            .select('phone')
            .in('phone', phones)

        const existingPhones = new Set((existingCustomers || []).map(c => c.phone))
        result.logs.push(`[${new Date().toISOString()}] Found ${existingPhones.size} existing phones in database`)

        // Process rows
        const customersToInsert: any[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowNum = i + 2 // Excel row number (1-indexed + header)

            try {
                // Normalize phone
                const phone = normalizePhone(row.phone)

                if (!phone) {
                    result.errors.push({ row: rowNum, phone: row.phone, error: 'Invalid or missing phone number' })
                    result.skipped++
                    continue
                }

                // Check for existing
                if (existingPhones.has(phone)) {
                    result.errors.push({ row: rowNum, phone, error: 'Phone already exists in database' })
                    result.skipped++
                    continue
                }

                // Check for duplicate in current batch
                if (customersToInsert.some(c => c.phone === phone)) {
                    result.errors.push({ row: rowNum, phone, error: 'Duplicate phone in import file' })
                    result.skipped++
                    continue
                }

                // Build customer object
                const customer: any = {
                    phone,
                    full_name: row.full_name || null,
                    email: row.email || null,
                    notes: row.notes || null,
                    status_tier: DEFAULT_TIER.name,
                    total_spend_minor: 0,
                    order_count: 0
                }

                // Measurements
                const heightCm = parseNumber(row.height_cm)
                const shoulderWidthCm = parseNumber(row.shoulder_width_cm)
                const bustCm = parseNumber(row.bust_cm)
                const waistCm = parseNumber(row.waist_cm)
                const hipsCm = parseNumber(row.hips_cm)
                const sleeveLengthCm = parseNumber(row.sleeve_length_cm)
                const productLengthCm = parseNumber(row.product_length_cm)
                const armHoleCm = parseNumber(row.arm_hole_cm)

                if (heightCm) customer.height_cm = heightCm
                if (shoulderWidthCm) customer.shoulder_width_cm = shoulderWidthCm
                if (bustCm) customer.bust_cm = bustCm
                if (waistCm) customer.waist_cm = waistCm
                if (hipsCm) customer.hips_cm = hipsCm
                if (sleeveLengthCm) customer.sleeve_length_cm = sleeveLengthCm
                if (productLengthCm) customer.product_length_cm = productLengthCm
                if (armHoleCm) customer.arm_hole_cm = armHoleCm

                // Measurement type
                if (row.measurement_type === 'custom' || (shoulderWidthCm || bustCm || waistCm || hipsCm)) {
                    customer.measurement_type = 'custom'
                } else if (row.standard_size) {
                    customer.measurement_type = 'standard'
                    customer.standard_size = row.standard_size.toLowerCase()
                }

                customersToInsert.push(customer)

            } catch (rowError: any) {
                result.errors.push({ row: rowNum, phone: row.phone, error: rowError.message || 'Unknown error' })
                result.skipped++
            }
        }

        result.logs.push(`[${new Date().toISOString()}] Prepared ${customersToInsert.length} customers for insert`)

        // Insert in batches of 100
        const batchSize = 100
        for (let i = 0; i < customersToInsert.length; i += batchSize) {
            const batch = customersToInsert.slice(i, i + batchSize)

            const { error: insertError } = await supabase
                .from('customers')
                .insert(batch)

            if (insertError) {
                result.logs.push(`[${new Date().toISOString()}] Batch ${Math.floor(i / batchSize) + 1} failed: ${insertError.message}`)
                // Try inserting one by one
                for (const customer of batch) {
                    const { error: singleError } = await supabase
                        .from('customers')
                        .insert(customer)

                    if (singleError) {
                        result.errors.push({ row: 0, phone: customer.phone, error: singleError.message })
                        result.skipped++
                    } else {
                        result.imported++
                    }
                }
            } else {
                result.imported += batch.length
                result.logs.push(`[${new Date().toISOString()}] Batch ${Math.floor(i / batchSize) + 1} imported: ${batch.length} customers`)
            }
        }

        result.success = result.imported > 0
        result.logs.push(`[${new Date().toISOString()}] Import completed: ${result.imported} imported, ${result.skipped} skipped`)

        return NextResponse.json({ result })

    } catch (error: any) {
        console.error('[Import] Error:', error)
        result.logs.push(`[${new Date().toISOString()}] Fatal error: ${error.message}`)
        return NextResponse.json({
            error: error.message || 'Import failed',
            result
        }, { status: 500 })
    }
}
