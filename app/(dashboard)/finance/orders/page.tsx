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
    source: string
    total_amount_minor: number
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
                    source,
                    total_amount_minor,
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
            if (statusFilter !== 'all' && order.status !== statusFilter) return false

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

    const getStatusColor = (status: string) => {
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
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by order #, customer, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-10 pr-8 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                        >
                            <option value="all">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* Sort */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (sortBy === 'date') {
                                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                                } else {
                                    setSortBy('date')
                                    setSortOrder('desc')
                                }
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sortBy === 'date'
                                ? 'bg-primary text-white'
                                : 'bg-background border border-border hover:bg-muted'
                                }`}
                        >
                            Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
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
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sortBy === 'amount'
                                ? 'bg-primary text-white'
                                : 'bg-background border border-border hover:bg-muted'
                                }`}
                        >
                            Amount {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </button>
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
                                                #{order.shopify_order_number || order.id.slice(0, 8)}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                {order.status}
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
                                                        className="hover:text-primary transition-colors"
                                                    >
                                                        {order.customer.full_name}
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
                                        <div className="text-2xl font-bold font-mono text-primary">
                                            {formatCurrency(totalAmount)}
                                        </div>
                                        {order.total_shipping_minor > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                (incl. {formatCurrency(order.total_shipping_minor)} shipping)
                                            </div>
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
