'use client'

import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { TopProduct } from '@/lib/finance/queries'
import { Crown, ShoppingBag, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface TopProductsListProps {
    data: TopProduct[]
    loading?: boolean
    className?: string
}

export function TopProductsList({
    data,
    loading = false,
    className
}: TopProductsListProps) {
    // Calculate max revenue for progress bar scaling
    const maxRevenue = data.length > 0 ? Math.max(...data.map(p => p.revenue)) : 0

    if (loading) {
        return (
            <div className={cn(
                "bg-white/65 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] h-80 md:h-96 flex flex-col animate-pulse",
                className
            )}>
                <div className="h-4 bg-gray-300/50 rounded w-1/3 mb-6"></div>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <div className="flex justify-between">
                                <div className="h-4 bg-gray-300/50 rounded w-24"></div>
                                <div className="h-4 bg-gray-300/50 rounded w-16"></div>
                            </div>
                            <div className="h-2 bg-gray-200/30 rounded-full w-full"></div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (!data || data.length === 0) {
        return (
            <div className={cn(
                "bg-white/65 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] h-80 md:h-96 flex flex-col",
                className
            )}>
                <h3 className="text-[10px] md:text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-4">
                    Top Selling Products
                </h3>
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
                    <ShoppingBag className="w-8 h-8 opacity-20" />
                    <p className="text-sm">No sales data yet</p>
                </div>
            </div>
        )
    }

    return (
        <div className={cn(
            "bg-white/65 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] h-80 md:h-96 flex flex-col group hover:bg-white/75 transition-all duration-300",
            className
        )}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] md:text-[11px] font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                    <Crown className="w-3 h-3 text-[var(--theme-primary)]" />
                    Top Performing Products
                </h3>
                <Link
                    href="/finance/orders"
                    className="text-[10px] uppercase font-semibold text-gray-400 hover:text-[var(--theme-primary)] transition-colors flex items-center gap-1 group/link"
                >
                    View All <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5">
                {data.map((product, index) => (
                    <div key={index} className="group/item">
                        <div className="flex justify-between items-end mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={cn(
                                    "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0",
                                    index === 0 ? "bg-amber-100 text-amber-700" :
                                        index === 1 ? "bg-gray-100 text-gray-600" :
                                            index === 2 ? "bg-orange-50 text-orange-700" :
                                                "bg-transparent text-gray-400 border border-gray-100"
                                )}>
                                    {index + 1}
                                </span>
                                <span className="text-sm font-medium text-gray-900 truncate">
                                    {product.name}
                                </span>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-sm font-mono font-bold text-gray-900">
                                    {formatCurrency(product.revenue)}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar & Subtext */}
                        <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[var(--theme-primary)] rounded-full transition-all duration-1000 ease-out group-hover/item:brightness-110"
                                    style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium">
                                {product.quantity} sold
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
