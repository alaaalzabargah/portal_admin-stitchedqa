'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const CustomerSchema = z.object({
    full_name: z.string().min(2, "Name is required"),
    phone: z.string().min(8, "Phone is required"),
    email: z.string().email().optional().or(z.literal('')),
    notes: z.string().optional(),

    // Measurement fields
    measurement_type: z.enum(['standard', 'custom']).optional(),
    standard_size: z.enum(['xs', 's', 'm', 'l', 'xl', '2xl', '3xl']).optional(),
    height_cm: z.coerce.number().positive().optional(),

    // Custom measurements
    shoulder_width_cm: z.coerce.number().positive().optional(),
    bust_cm: z.coerce.number().positive().optional(),
    waist_cm: z.coerce.number().positive().optional(),
    hips_cm: z.coerce.number().positive().optional(),
    sleeve_length_cm: z.coerce.number().positive().optional(),
    product_length_cm: z.coerce.number().positive().optional(),
    arm_hole_cm: z.coerce.number().positive().optional(),
})

function extractCustomerData(formData: FormData) {
    return {
        full_name: formData.get('full_name'),
        phone: formData.get('phone'),
        email: formData.get('email') || '',
        notes: formData.get('notes') || '',

        // Measurement fields
        measurement_type: formData.get('measurement_type') || undefined,
        standard_size: formData.get('standard_size') || undefined,
        height_cm: formData.get('height_cm') || undefined,

        // Custom measurements
        shoulder_width_cm: formData.get('shoulder_width_cm') || undefined,
        bust_cm: formData.get('bust_cm') || undefined,
        waist_cm: formData.get('waist_cm') || undefined,
        hips_cm: formData.get('hips_cm') || undefined,
        sleeve_length_cm: formData.get('sleeve_length_cm') || undefined,
        product_length_cm: formData.get('product_length_cm') || undefined,
        arm_hole_cm: formData.get('arm_hole_cm') || undefined,
    }
}

export async function createCustomer(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const rawData = extractCustomerData(formData)
    const validated = CustomerSchema.safeParse(rawData)

    if (!validated.success) {
        return { error: validated.error.issues[0].message }
    }

    // Clean up data - remove undefined values
    const cleanData = Object.fromEntries(
        Object.entries(validated.data).filter(([_, v]) => v !== undefined && v !== '')
    )

    const { data, error } = await supabase
        .from('customers')
        .insert(cleanData)
        .select()
        .single()

    if (error) {
        console.error('Create customer error:', error)
        return { error: 'Failed to create customer. Phone might be duplicate.' }
    }

    if (!data || !data.id) {
        return { error: 'Customer created but ID not returned' }
    }

    // Verify the customer was created by fetching it
    const { data: verifyData, error: verifyError } = await supabase
        .from('customers')
        .select('id')
        .eq('id', data.id)
        .single()

    if (verifyError || !verifyData) {
        console.error('Customer verification failed:', verifyError)
        return { error: 'Customer created but verification failed. Please refresh.' }
    }

    // Revalidate paths before redirect
    revalidatePath('/customers')
    revalidatePath(`/customers/${data.id}`)

    // Redirect to the customer detail page
    redirect(`/customers/${data.id}`)
}

export async function updateCustomer(id: string, prevState: any, formData: FormData) {
    const supabase = await createClient()

    const rawData = extractCustomerData(formData)
    const validated = CustomerSchema.safeParse(rawData)

    if (!validated.success) {
        return { error: validated.error.issues[0].message }
    }

    // Clean up data - remove undefined values
    const cleanData = Object.fromEntries(
        Object.entries(validated.data).filter(([_, v]) => v !== undefined && v !== '')
    )

    const { error } = await supabase
        .from('customers')
        .update(cleanData)
        .eq('id', id)

    if (error) {
        console.error('Update customer error:', error)
        return { error: 'Failed to update customer.' }
    }

    // Verify the update by fetching the customer
    const { data: verifyData, error: verifyError } = await supabase
        .from('customers')
        .select('id')
        .eq('id', id)
        .single()

    if (verifyError || !verifyData) {
        console.error('Customer update verification failed:', verifyError)
        return { error: 'Customer updated but verification failed. Please refresh.' }
    }

    // Revalidate paths before redirect
    revalidatePath(`/customers/${id}`)
    revalidatePath('/customers')

    // Redirect to the customer detail page
    redirect(`/customers/${id}`)
}
