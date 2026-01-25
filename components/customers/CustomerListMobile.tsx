'use client'

import Link from 'next/link'
import { Customer } from '@/lib/types/customer'
import { LoyaltyTier } from '@/lib/settings/types'
import { formatCurrency, cn, getContrastColor } from '@/lib/utils'
import { Copy, Phone, ShoppingBag, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/context'
import { useState } from 'react'

interface CustomerListMobileProps {
    customers: Customer[]
    tiers: LoyaltyTier[]
    isSelectionMode?: boolean
    selectedIds?: Set<string>
    onToggleSelect?: (id: string) => void
}

export function CustomerListMobile({
    customers,
    tiers,
    isSelectionMode,
    selectedIds,
    onToggleSelect
}: CustomerListMobileProps) {
    const { t } = useLanguage()
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const copyPhone = (e: React.MouseEvent, phone: string, id: string) => {
        e.preventDefault()
        e.stopPropagation()
        navigator.clipboard.writeText(phone)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    return (
        <div className="grid grid-cols-1 gap-3 lg:hidden">
            {customers?.map((customer) => (
                <div
                    key={customer.id}
                    onClick={() => {
                        if (isSelectionMode && onToggleSelect) {
                            onToggleSelect(customer.id)
                        }
                    }}
                    className={cn(
                        "block bg-white p-4 rounded-2xl border border-sand-200 shadow-sm active:scale-[0.99] transition-all relative",
                        isSelectionMode && selectedIds?.has(customer.id) && 'ring-2 ring-accent bg-accent/5'
                    )}
                >
                    {/* Link wrapper if not selection mode */}
                    {!isSelectionMode ? (
                        <Link href={`/customers/${customer.id}`} className="absolute inset-0 z-0" />
                    ) : null}

                    <div className="relative z-10 pointer-events-none"> {/* Content wrapper */}
                        {isSelectionMode && (
                            <div className="absolute top-0 right-0 pointer-events-auto">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-full border-gray-300 text-primary focus:ring-primary"
                                    checked={selectedIds?.has(customer.id)}
                                    onChange={() => onToggleSelect?.(customer.id)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-4 pointer-events-auto">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-sand-200 flex items-center justify-center text-primary font-serif font-bold text-lg">
                                    {customer.full_name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-primary">{customer.full_name || 'Guest'}</h3>
                                    <div
                                        className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 cursor-pointer hover:text-accent"
                                        onClick={(e) => copyPhone(e, customer.phone, customer.id)}
                                    >
                                        <Phone className="w-3 h-3" />
                                        {customer.phone}
                                        {copiedId === customer.id ? (
                                            <span className="text-green-600 font-medium ml-1 animate-fade-in">{t('customers.table.copied')}</span>
                                        ) : (
                                            <Copy className="w-3 h-3 ml-1 opacity-50" />
                                        )}
                                    </div>
                                </div>
                            </div>
                            {(() => {
                                const tier = tiers.find(t => t.name === customer.status_tier)
                                const bgColor = tier?.color || '#F3F4F6'
                                const textColor = tier ? getContrastColor(tier.color) : '#4B5563'

                                return (
                                    <span
                                        className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
                                        style={{ backgroundColor: bgColor, color: textColor }}
                                    >
                                        {customer.status_tier}
                                    </span>
                                )
                            })()}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-sand-100">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{t('customers.table.total_spend')}</p>
                                <p className="font-serif font-medium text-primary">{formatCurrency(customer.total_spend_minor)}</p>
                            </div>
                            <div className="text-right rtl:text-left">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{t('customers.table.orders')}</p>
                                <p className="font-medium text-primary flex items-center justify-end rtl:justify-start gap-1">
                                    <ShoppingBag className="w-3 h-3 text-sand-400" /> {customer.order_count}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
