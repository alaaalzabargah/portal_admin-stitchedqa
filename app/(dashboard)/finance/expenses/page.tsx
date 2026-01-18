import { createClient } from '@/lib/supabase/server'
import { formatCurrency, cn } from '@/lib/utils'
import { Plus, Filter, Paperclip } from 'lucide-react'
import Link from 'next/link'
import { NewExpenseForm } from '@/components/finance/NewExpenseForm'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function ExpensesPage({ searchParams }: { searchParams: { new?: string } }) {
    const supabase = await createClient()

    const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .order('incurred_at', { ascending: false })

    return (
        <div className="p-4 md:p-8 space-y-8 relative">
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
                <PageHeader
                    label="EXPENSES"
                    title="Expenses"
                    subtitle="Track operational costs"
                    className="pb-0 mb-0 border-0"
                />

                <Link href="?new=true" className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-secondary transition-colors text-sm font-medium">
                    <Plus className="w-4 h-4" />
                    <span>Log Expense</span>
                </Link>
            </div>

            {/* List */}
            <div className="glass-panel rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-sand-50 text-muted-foreground font-medium border-b border-sand-200">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-sand-100">
                        {expenses?.map((expense) => (
                            <tr key={expense.id} className="hover:bg-sand-50/50 transition-colors">
                                <td className="px-6 py-4 text-secondary">{new Date(expense.incurred_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-md bg-sand-100 text-xs font-medium text-secondary border border-sand-200">
                                        {expense.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground flex items-center gap-2">
                                    {expense.description}
                                    {expense.attachment_path && <Paperclip className="w-3 h-3 text-accent" />}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-primary">
                                    {formatCurrency(expense.amount_minor, expense.currency)}
                                </td>
                            </tr>
                        ))}
                        {(!expenses || expenses.length === 0) && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No expenses logged yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Simple Modal for "New Expense" via Search Params */}
            {searchParams.new === 'true' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Link href="/finance/expenses" className="absolute inset-0 cursor-default" />
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative z-10 glass-panel">
                        <h2 className="text-xl font-serif mb-6">Log New Expense</h2>
                        <NewExpenseForm />
                    </div>
                </div>
            )}
        </div>
    )
}
