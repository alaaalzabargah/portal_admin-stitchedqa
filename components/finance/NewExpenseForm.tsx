'use client'

import { useActionState } from 'react'
import { createExpense } from '@/app/(dashboard)/finance/expenses/actions'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/context'

const initialState = {
    error: '',
}

export function NewExpenseForm() {
    const [state, formAction, isPending] = useActionState(createExpense, initialState)
    const { t } = useLanguage()

    return (
        <form action={formAction} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">{t('common.category')}</label>
                <select name="category" className="w-full px-4 py-2 rounded-lg border border-sand-300 bg-white">
                    <option value="Fabrics">Fabrics</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Rent">Rent</option>
                    <option value="Operations">Operations</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">{t('common.amount')}</label>
                    <input name="amount" type="number" step="0.01" required className="w-full px-4 py-2 rounded-lg border border-sand-300 outline-none focus:ring-1 focus:ring-accent" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">{t('common.currency')}</label>
                    <select name="currency" className="w-full px-4 py-2 rounded-lg border border-sand-300 bg-white">
                        <option value="QAR">QAR</option>
                        <option value="SAR">SAR</option>
                        <option value="USD">USD</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">{t('common.description')}</label>
                <input name="description" className="w-full px-4 py-2 rounded-lg border border-sand-300 outline-none focus:ring-1 focus:ring-accent" placeholder="Details..." />
            </div>

            {state?.error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                    {state.error}
                </div>
            )}

            <div className="pt-4 flex justify-end gap-3">
                <Link href="/finance/expenses" className="px-4 py-2 rounded-lg border border-sand-300 text-secondary hover:bg-sand-50">{t('common.cancel')}</Link>
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-secondary disabled:opacity-50 flex items-center gap-2"
                >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('common.save')}
                </button>
            </div>
        </form>
    )
}
