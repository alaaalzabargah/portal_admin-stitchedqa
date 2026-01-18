'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus, Loader2, DollarSign, Package } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/context'
import { formatCurrency } from '@/lib/utils'

interface OrderItem {
    product_name: string
    size: string
    color: string
    quantity: number
    price: number // In major currency units (e.g., 450.00)
}

interface AddOrderModalProps {
    customerId: string
    customerName: string
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

// Common sizes for garments
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '52', '54', '56', '58', '60', '62']

export function AddOrderModal({ customerId, customerName, isOpen, onClose, onSuccess }: AddOrderModalProps) {
    const { t, direction } = useLanguage()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Order fields
    const [notes, setNotes] = useState('')
    const [status, setStatus] = useState<'paid' | 'pending'>('paid')

    // Items
    const [items, setItems] = useState<OrderItem[]>([
        { product_name: '', size: '', color: '', quantity: 1, price: 0 }
    ])

    // Calculated total - derived from items, no need for separate state
    const calculatedTotal = items.reduce((sum, item) => {
        return sum + (item.price * item.quantity)
    }, 0)

    const addItem = () => {
        setItems([...items, { product_name: '', size: '', color: '', quantity: 1, price: 0 }])
    }

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index))
        }
    }

    const updateItem = (index: number, field: keyof OrderItem, value: any) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        setItems(newItems)
    }

    const handleSubmit = async () => {
        // Validate - need at least one item with a name and price
        const validItems = items.filter(i => i.product_name.trim() && i.price > 0)
        if (validItems.length === 0 && calculatedTotal <= 0) {
            setError(t('orders.validation_error') || 'Please add at least one item with a price')
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId,
                    total_amount_minor: Math.round(calculatedTotal * 100),
                    status,
                    notes: notes.trim() || undefined,
                    items: items.filter(i => i.product_name.trim()).map(i => ({
                        product_name: i.product_name,
                        variant_title: [i.size, i.color].filter(Boolean).join(' / ') || null,
                        size: i.size || null,
                        color: i.color || null,
                        quantity: i.quantity,
                        price_minor: Math.round(i.price * 100)
                    }))
                })
            })

            const data = await response.json()

            if (data.success) {
                // Reset form
                setItems([{ product_name: '', size: '', color: '', quantity: 1, price: 0 }])
                setNotes('')
                setStatus('paid')
                onSuccess()
                onClose()
            } else {
                setError(data.error || t('orders.error_msg'))
            }
        } catch (err) {
            setError(t('orders.error_msg'))
        }

        setLoading(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-sand-200 dark:border-zinc-700">
                    <div>
                        <h2 className="text-xl font-semibold text-primary dark:text-white">{t('orders.add_manual_order')}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{t('orders.for')}: {customerName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-sand-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Status */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-secondary dark:text-zinc-300">
                            {t('orders.status')}
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStatus('paid')}
                                className={`flex-1 py-3 rounded-xl font-medium transition-all ${status === 'paid'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-sand-50 dark:bg-zinc-800 text-secondary dark:text-zinc-400 border border-sand-200 dark:border-zinc-700'
                                    }`}
                            >
                                {t('orders.paid')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus('pending')}
                                className={`flex-1 py-3 rounded-xl font-medium transition-all ${status === 'pending'
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-2 border-amber-300 dark:border-amber-700'
                                    : 'bg-sand-50 dark:bg-zinc-800 text-secondary dark:text-zinc-400 border border-sand-200 dark:border-zinc-700'
                                    }`}
                            >
                                {t('orders.pending')}
                            </button>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-secondary dark:text-zinc-300">
                                {t('orders.items')}
                            </label>
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-sm text-accent hover:underline flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> {t('orders.add_item')}
                            </button>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="p-4 bg-sand-50 dark:bg-zinc-800 rounded-xl space-y-3 border border-sand-100 dark:border-zinc-700">
                                {/* Product Name */}
                                <div className="flex gap-2 items-start">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-1">
                                        <Package className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <input
                                        type="text"
                                        value={item.product_name}
                                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                                        placeholder={t('orders.product_name_placeholder') || 'Product name'}
                                        className="flex-1 px-3 py-2 border border-sand-200 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:text-white"
                                    />
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Size & Color Row */}
                                <div className="flex gap-3 ml-10">
                                    {/* Size Dropdown */}
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">
                                            {t('orders.size_label')}
                                        </label>
                                        <select
                                            value={item.size}
                                            onChange={(e) => updateItem(index, 'size', e.target.value)}
                                            className="w-full px-3 py-2 border border-sand-200 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:text-white"
                                        >
                                            <option value="">{t('orders.select_size')}</option>
                                            {SIZES.map(size => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Color Input */}
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">
                                            {t('orders.color_label')}
                                        </label>
                                        <input
                                            type="text"
                                            value={item.color}
                                            onChange={(e) => updateItem(index, 'color', e.target.value)}
                                            placeholder={t('orders.color_placeholder')}
                                            className="w-full px-3 py-2 border border-sand-200 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Quantity & Price Row */}
                                <div className="flex gap-3 items-end ml-10">
                                    <div className="w-20">
                                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">
                                            {t('orders.qty_label') || 'Qty'}
                                        </label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                            min={1}
                                            className="w-full px-3 py-2 border border-sand-200 dark:border-zinc-600 rounded-lg text-sm text-center bg-white dark:bg-zinc-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">
                                            {t('orders.price_label') || 'Price'} (QAR)
                                        </label>
                                        <input
                                            type="number"
                                            value={item.price || ''}
                                            onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                                            placeholder="0.00"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-sand-200 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="pb-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
                                        = {formatCurrency((item.price || 0) * item.quantity * 100)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Auto-Calculated Total */}
                    <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                {t('orders.total_amount') || 'Total Amount'}
                            </span>
                        </div>
                        <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                            {formatCurrency(calculatedTotal * 100)}
                        </span>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-secondary dark:text-zinc-300">
                            {t('orders.notes')}
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t('orders.additional_notes') || 'Additional notes...'}
                            rows={2}
                            className="w-full px-4 py-3 border border-sand-200 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent resize-none bg-white dark:bg-zinc-900 dark:text-white"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-sand-200 dark:border-zinc-700 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 border border-sand-200 dark:border-zinc-600 rounded-xl font-medium text-secondary dark:text-zinc-400 hover:bg-sand-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        {t('orders.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || calculatedTotal <= 0}
                        className="flex-1 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('orders.creating')}
                            </>
                        ) : (
                            t('orders.create')
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
