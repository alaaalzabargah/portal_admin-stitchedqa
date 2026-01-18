'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const ExpenseSchema = z.object({
    category: z.string().min(1, "Category is required"),
    amount_minor: z.coerce.number().min(1, "Amount must be greater than 0"),
    currency: z.string().default('QAR'),
    description: z.string().optional(),
})

export async function createExpense(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const rawData = {
        category: formData.get('category'),
        amount_minor: parseFloat(formData.get('amount') as string || '0') * 100, // Convert to minor
        currency: formData.get('currency'),
        description: formData.get('description'),
    }

    const validated = ExpenseSchema.safeParse(rawData)

    if (!validated.success) {
        return { error: validated.error.issues[0].message }
    }

    const { error } = await supabase
        .from('expenses')
        .insert({
            ...validated.data,
            updated_by: (await supabase.auth.getUser()).data.user?.id
        })

    if (error) {
        return { error: 'Failed to create expense.' }
    }

    revalidatePath('/finance/expenses')
    redirect('/finance/expenses')
}
