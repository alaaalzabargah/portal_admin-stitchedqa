'use client'

import { useState } from 'react'
import { Users, MessageCircle, DollarSign, Plus, X } from 'lucide-react'
import Link from 'next/link'

export function QuickActionsFAB() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10 animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Action Menu Items */}
            <div className={`absolute bottom-20 right-0 flex flex-col gap-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                {/* Add Customer */}
                <Link
                    href="/customers/new"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-end gap-3 group"
                >
                    <span className="text-sm font-semibold text-gray-700 bg-white px-3 py-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Add Customer
                    </span>
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 transition-all"
                        style={{
                            background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-via), var(--theme-gradient-to))',
                        }}
                    >
                        <Users className="w-5 h-5" style={{ color: 'var(--theme-text-primary)' }} />
                    </div>
                </Link>

                {/* Marketing Campaign */}
                <Link
                    href="/marketing"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-end gap-3 group"
                >
                    <span className="text-sm font-semibold text-gray-700 bg-white px-3 py-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Campaign
                    </span>
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
                        style={{
                            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                        }}
                    >
                        <MessageCircle className="w-5 h-5" />
                    </div>
                </Link>

                {/* Finance */}
                <Link
                    href="/finance"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-end gap-3 group"
                >
                    <span className="text-sm font-semibold text-gray-700 bg-white px-3 py-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Finance
                    </span>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white text-gray-800 border-2 border-gray-200 shadow-lg hover:shadow-xl active:scale-95 transition-all">
                        <DollarSign className="w-5 h-5" />
                    </div>
                </Link>
            </div>

            {/* Main FAB Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl active:scale-95 transition-all ${isOpen ? 'rotate-45' : 'rotate-0'}`}
                style={{
                    background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-via), var(--theme-gradient-to))',
                }}
            >
                <Plus className="w-6 h-6" style={{ color: 'var(--theme-text-primary)' }} />
            </button>
        </div>
    )
}
