'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/context'
import { formatCurrency } from '@/lib/utils'
import { Search, Filter, ChevronDown, Package, User, Calendar } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'

interface OrderCustomer {
    id: string
    full_name: string
    phone: string
    email: string
}

interface OrderItem {
    id: string
    product_name: string
    variant_title: string | null
    quantity: number
    unit_price_minor: number
}

interface Order {
    id: string
    shopify_order_number: string
    created_at: string
    status: string
    financial_status?: string | null
    source: string
    total_amount_minor: number
    paid_amount_minor?: number | null
    total_shipping_minor: number
    total_tax_minor: number
    customer: OrderCustomer | null
    order_items: OrderItem[]
}

export default function OrderHistoryPage() {
    const { t } = useLanguage()
    const supabase = createClient()

    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    useEffect(() => {
        loadOrders()
    }, [])

    const loadOrders = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    shopify_order_number,
                    created_at,
                    status,
                    financial_status,
                    source,
                    total_amount_minor,
                    paid_amount_minor,
                    total_shipping_minor,
                    total_tax_minor,
                    customer:customer_id (
                        id,
                        full_name,
                        phone,
                        email
                    ),
                    order_items (
                        id,
                        product_name,
                        variant_title,
                        quantity,
                        unit_price_minor
                    )
                `)
                .eq('is_test', false)
                .or('status.in.(paid,completed,shipped),financial_status.eq.partially_paid')
                .order('created_at', { ascending: false })
                .limit(200)

            if (error) throw error

            // Transform data - customer comes as array from Supabase FK relations
            const transformedData: Order[] = (data || []).map((order: any) => ({
                ...order,
                customer: Array.isArray(order.customer) ? order.customer[0] || null : order.customer,
                order_items: order.order_items || []
            }))

            // Debug log to compare with customer page
            console.log('Finance Page Orders (First 3):', transformedData.slice(0, 3).map(o => ({
                id: o.id,
                shipping: o.total_shipping_minor,
                keys: Object.keys(o)
            })))

            setOrders(transformedData)
        } catch (error) {
            console.error('Error loading orders:', error)
        } finally {
            setLoading(false)
        }
    }

    // Filter and sort orders
    const filteredOrders = orders
        .filter(order => {
            // Status filter
            if (statusFilter === 'deposit' && order.financial_status !== 'partially_paid') return false
            if (statusFilter !== 'all' && statusFilter !== 'deposit' && order.status !== statusFilter) return false

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                const matchesOrderNumber = order.shopify_order_number?.toLowerCase().includes(query)
                const matchesCustomer = order.customer?.full_name?.toLowerCase().includes(query)
                const matchesPhone = order.customer?.phone?.includes(query)
                return matchesOrderNumber || matchesCustomer || matchesPhone
            }

            return true
        })
        .sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = new Date(a.created_at).getTime()
                const dateB = new Date(b.created_at).getTime()
                return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
            } else {
                const totalA = a.total_amount_minor + (a.total_shipping_minor || 0)
                const totalB = b.total_amount_minor + (b.total_shipping_minor || 0)
                return sortOrder === 'desc' ? totalB - totalA : totalA - totalB
            }
        })

    const getStatusColor = (status: string, financialStatus?: string | null) => {
        if (financialStatus === 'partially_paid') return 'bg-purple-100 text-purple-700'
        switch (status) {
            case 'paid':
            case 'completed':
                return 'bg-green-100 text-green-700'
            case 'pending':
                return 'bg-yellow-100 text-yellow-700'
            case 'cancelled':
            case 'refunded':
                return 'bg-red-100 text-red-700'
            default:
                return 'bg-gray-100 text-gray-700'
        }
    }

    const getStatusLabel = (status: string, financialStatus?: string | null) => {
        if (financialStatus === 'partially_paid') return 'Deposit'
        return status
    }

    return (
        <div className="p-4 md:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <PageHeader
                label="ORDERS"
                title="Order History"
                subtitle="Complete history of all orders and transactions"
            />

            {/* Filters and Search */}
            <div className="glass-card p-4 rounded-xl space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[280px] relative group shrink-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by order #, customer, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-11 pr-4 bg-white/60 hover:bg-white/80 border border-black/5 hover:border-primary/30 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm placeholder:text-muted-foreground/60 shadow-sm"
                        />
                    </div>

                    <div className="flex flex-row items-center gap-2 sm:gap-3 w-full md:w-auto shrink-0 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
                        {/* Status Filter */}
                        <div className="relative group shrink-0">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full h-11 pl-10 pr-10 bg-white/60 hover:bg-white/80 border border-black/5 hover:border-primary/30 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none cursor-pointer shadow-sm text-foreground font-medium"
                            >
                                <option value="all">Status</option>
                                <option value="paid">Paid</option>
                                <option value="deposit">Deposit</option>
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                        </div>

                        {/* Sort Toggle (Segmented Control style) */}
                        <div className="flex p-1 h-11 bg-white/50 border border-black/5 rounded-2xl shadow-sm leading-none shrink-0 text-sm">
                            <button
                                onClick={() => {
                                    if (sortBy === 'date') {
                                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                                    } else {
                                        setSortBy('date')
                                        setSortOrder('desc')
                                    }
                                }}
                                className={`flex h-full items-center justify-center gap-1.5 px-3.5 rounded-xl transition-all font-medium ${sortBy === 'date'
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/60'
                                    }`}
                            >
                                Date
                                {sortBy === 'date' && (
                                    <span className="text-[10px] leading-none opacity-80">{sortOrder === 'desc' ? '▼' : '▲'}</span>
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    if (sortBy === 'amount') {
                                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                                    } else {
                                        setSortBy('amount')
                                        setSortOrder('desc')
                                    }
                                }}
                                className={`flex h-full items-center justify-center gap-1.5 px-3.5 rounded-xl transition-all font-medium ${sortBy === 'amount'
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/60'
                                    }`}
                            >
                                Amount
                                {sortBy === 'amount' && (
                                    <span className="text-[10px] leading-none opacity-80">{sortOrder === 'desc' ? '▼' : '▲'}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results count */}
                <div className="text-sm text-muted-foreground">
                    Showing {filteredOrders.length} of {orders.length} orders
                </div>
            </div>

            {/* Orders List */}
            {loading ? (
                <div className="glass-card p-12 rounded-xl text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading orders...</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="glass-card p-12 rounded-xl text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No orders found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => {
                        const totalAmount = order.total_amount_minor
                        const itemCount = order.order_items?.length || 0

                        return (
                            <div key={order.id} className="glass-card p-5 rounded-xl hover:shadow-lg transition-all">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                    {/* Order Info */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="font-semibold text-lg">
                                                {order.customer ? (
                                                    <Link 
                                                        href={`/customers/${order.customer.id}?tab=orders&from=/finance/orders`}
                                                        className="text-primary/95 hover:text-primary underline underline-offset-[5px] decoration-primary/30 hover:decoration-primary transition-all duration-200 inline-block"
                                                    >
                                                        #{order.shopify_order_number || order.id.slice(0, 8)}
                                                    </Link>
                                                ) : (
                                                    `#${order.shopify_order_number || order.id.slice(0, 8)}`
                                                )}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status, order.financial_status)}`}>
                                                {getStatusLabel(order.status, order.financial_status)}
                                            </span>
                                            {order.source && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                    {order.source}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                            </div>
                                            {order.customer && (
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4" />
                                                    <Link
                                                        href={`/customers/${order.customer.id}`}
                                                        className="group flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
                                                    >
                                                        <span className="border-b border-dashed border-muted-foreground/30 group-hover:border-primary/50 transition-colors pb-0.5">
                                                            {order.customer.full_name}
                                                        </span>
                                                        <span className="opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200 text-[10px]">
                                                            ↗
                                                        </span>
                                                    </Link>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4" />
                                                <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                                            </div>
                                        </div>

                                        {/* Order Items Preview */}
                                        {order.order_items && order.order_items.length > 0 && (
                                            <div className="text-sm text-muted-foreground">
                                                {order.order_items.slice(0, 2).map((item, idx) => (
                                                    <div key={item.id}>
                                                        {item.quantity}x {item.product_name}
                                                        {item.variant_title && ` - ${item.variant_title}`}
                                                    </div>
                                                ))}
                                                {order.order_items.length > 2 && (
                                                    <div className="text-xs text-muted-foreground/70">
                                                        +{order.order_items.length - 2} more items
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right">
                                        {order.financial_status === 'partially_paid' ? (
                                            <>
                                                <div className="text-2xl font-bold font-mono text-primary">
                                                    {formatCurrency(order.paid_amount_minor ?? 0)}
                                                </div>
                                                <div className="text-sm font-medium text-purple-600 mt-1">
                                                    Rem: {formatCurrency((order.total_amount_minor ?? 0) - (order.paid_amount_minor ?? 0))}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    Total: {formatCurrency(order.total_amount_minor)}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-2xl font-bold font-mono text-primary">
                                                    {formatCurrency(order.total_amount_minor)}
                                                </div>
                                                {order.total_shipping_minor > 0 && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        (incl. {formatCurrency(order.total_shipping_minor)} shipping)
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
