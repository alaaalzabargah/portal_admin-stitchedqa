'use client'

import Link from 'next/link'
import { Customer } from '@/lib/types/customer'
import { LoyaltyTier } from '@/lib/settings/types'
import { formatCurrency, cn, getContrastColor } from '@/lib/utils'
import { Copy, MoreHorizontal, Trash2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/context'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDialog } from '@/lib/dialog'
import { deleteCustomer } from '@/lib/actions/customer'

interface CustomerListDesktopProps {
    customers: Customer[]
    tiers: LoyaltyTier[]
    isSelectionMode?: boolean
    selectedIds?: Set<string>
    onToggleSelect?: (id: string) => void
    onSelectAll?: () => void
}

export function CustomerListDesktop({
    customers,
    tiers,
    isSelectionMode,
    selectedIds,
    onToggleSelect,
    onSelectAll
}: CustomerListDesktopProps) {
    const { t } = useLanguage()
    const dialog = useDialog()
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const router = useRouter()

    const copyPhone = (e: React.MouseEvent, phone: string, id: string) => {
        e.preventDefault()
        e.stopPropagation()
        navigator.clipboard.writeText(phone)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault()
        e.stopPropagation()
        const confirmed = await dialog.confirm(
            t('customers.delete_confirm') || 'Are you sure you want to delete this client?',
            'Delete Customer'
        )
        if (confirmed) {
            setDeletingId(id)
            const res = await deleteCustomer(id)
            setDeletingId(null)
            if (!res.success) {
                await dialog.alert(res.error || 'An error occurred', 'Error')
            }
        }
    }

    return (
        <div className="hidden lg:block bg-white/65 backdrop-blur-xl border border-white/40 overflow-hidden rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]">
            <table className="w-full text-sm text-left rtl:text-right">
                <thead className="bg-white/50 text-gray-600 font-medium border-b border-white/30">
                    <tr>
                        {isSelectionMode && (
                            <th className="px-4 py-5 w-12">
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={customers.length > 0 && selectedIds?.size === customers.length}
                                        onChange={onSelectAll}
                                    />
                                </div>
                            </th>
                        )}
                        <th className="px-8 py-5 text-xs uppercase tracking-widest font-semibold rtl:text-right">{t('customers.table.customer')}</th>
                        <th className="px-8 py-5 text-xs uppercase tracking-widest font-semibold rtl:text-right">{t('customers.table.phone')}</th>
                        <th className="px-8 py-5 text-xs uppercase tracking-widest font-semibold rtl:text-right">{t('customers.table.status')}</th>
                        <th className="px-8 py-5 text-xs uppercase tracking-widest font-semibold rtl:text-right">{t('customers.table.total_spend')}</th>
                        <th className="px-8 py-5 text-xs uppercase tracking-widest font-semibold text-right rtl:text-left">{t('customers.table.orders')}</th>
                        <th className="px-8 py-5 text-xs uppercase tracking-widest font-semibold text-right rtl:text-left w-12"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                    {customers?.map((customer, index) => (
                        <tr
                            key={customer.id}
                            className={cn(
                                "group cursor-pointer transition-all",
                                "hover:bg-white/40",
                                selectedIds?.has(customer.id) ? 'bg-white/30' : 'bg-transparent'
                            )}
                            onClick={(e) => {
                                if (isSelectionMode && onToggleSelect) {
                                    e.preventDefault()
                                    onToggleSelect(customer.id)
                                } else {
                                    router.push(`/customers/${customer.id}`)
                                }
                            }}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {isSelectionMode && (
                                <td className="px-4 py-5" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={selectedIds?.has(customer.id)}
                                            onChange={() => onToggleSelect?.(customer.id)}
                                        />
                                    </div>
                                </td>
                            )}
                            <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-sand-200 flex items-center justify-center text-primary font-serif font-bold text-sm">
                                        {customer.full_name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-primary text-base hover:text-accent transition-colors underline-offset-4 group-hover:underline">
                                            {customer.full_name || 'Guest'}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-5">
                                <div
                                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors w-fit px-2 py-1 rounded-md hover:bg-black/5"
                                    onClick={(e) => copyPhone(e, customer.phone, customer.id)}
                                >
                                    <span className="font-mono">{customer.phone}</span>
                                    {copiedId === customer.id ? (
                                        <span className="text-[10px] text-green-600 font-bold">{t('customers.table.copied')}</span>
                                    ) : (
                                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50 hover:opacity-100" />
                                    )}
                                </div>
                            </td>
                            <td className="px-8 py-5">
                                {(() => {
                                    const tier = tiers.find(t => t.name === customer.status_tier)
                                    const bgColor = tier?.color || '#F3F4F6' // Default to sand/gray
                                    const textColor = tier ? getContrastColor(tier.color) : '#4B5563'

                                    return (
                                        <span
                                            className="px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider shadow-sm"
                                            style={{ backgroundColor: bgColor, color: textColor }}
                                        >
                                            {customer.status_tier}
                                        </span>
                                    )
                                })()}
                            </td>
                            <td className="px-8 py-5 font-medium text-primary">
                                {formatCurrency(customer.total_spend_minor)}
                            </td>
                            <td className="px-8 py-5 text-right rtl:text-left text-muted-foreground">
                                {customer.order_count}
                            </td>
                            <td className="px-4 py-5 text-right">
                                {!isSelectionMode && (
                                    <button
                                        onClick={(e) => handleDelete(e, customer.id)}
                                        disabled={deletingId === customer.id}
                                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Customer"
                                    >
                                        {deletingId === customer.id ? (
                                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {(!customers || customers.length === 0) && (
                        <tr>
                            <td colSpan={isSelectionMode ? 7 : 6} className="py-12 text-center text-muted-foreground">
                                <p>{t('customers.table.no_clients')}</p>
                                <p className="text-xs mt-1">{t('customers.table.try_adjusting')}</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
