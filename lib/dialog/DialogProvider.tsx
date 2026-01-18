'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { AlertCircle, CheckCircle, AlertTriangle, X } from 'lucide-react'

interface DialogOptions {
    title?: string
    message: string
    type?: 'info' | 'success' | 'warning' | 'error' | 'confirm'
    confirmText?: string
    cancelText?: string
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void
}

interface DialogContextType {
    showDialog: (options: DialogOptions) => Promise<boolean>
    alert: (message: string, title?: string) => Promise<void>
    confirm: (message: string, title?: string) => Promise<boolean>
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export function DialogProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [options, setOptions] = useState<DialogOptions>({ message: '' })
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null)

    const showDialog = (opts: DialogOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setOptions(opts)
            setIsOpen(true)
            setResolver(() => resolve)
        })
    }

    const alert = (message: string, title?: string): Promise<void> => {
        return new Promise((resolve) => {
            showDialog({
                message,
                title,
                type: 'info',
                confirmText: 'OK'
            }).then(() => resolve())
        })
    }

    const confirm = (message: string, title?: string): Promise<boolean> => {
        return showDialog({
            message,
            title,
            type: 'confirm',
            confirmText: 'Confirm',
            cancelText: 'Cancel'
        })
    }

    const handleConfirm = async () => {
        if (options.onConfirm) {
            await options.onConfirm()
        }
        resolver?.(true)
        setIsOpen(false)
    }

    const handleCancel = () => {
        if (options.onCancel) {
            options.onCancel()
        }
        resolver?.(false)
        setIsOpen(false)
    }

    const getIcon = () => {
        switch (options.type) {
            case 'success':
                return <CheckCircle className="w-6 h-6 text-green-600" />
            case 'warning':
                return <AlertTriangle className="w-6 h-6 text-amber-600" />
            case 'error':
                return <AlertCircle className="w-6 h-6 text-red-600" />
            default:
                return <AlertCircle className="w-6 h-6 text-blue-600" />
        }
    }

    const getColors = () => {
        switch (options.type) {
            case 'success':
                return {
                    bg: 'bg-green-50 dark:bg-green-900/20',
                    border: 'border-green-200 dark:border-green-800',
                    button: 'bg-green-600 hover:bg-green-700'
                }
            case 'warning':
                return {
                    bg: 'bg-amber-50 dark:bg-amber-900/20',
                    border: 'border-amber-200 dark:border-amber-800',
                    button: 'bg-amber-600 hover:bg-amber-700'
                }
            case 'error':
                return {
                    bg: 'bg-red-50 dark:bg-red-900/20',
                    border: 'border-red-200 dark:border-red-800',
                    button: 'bg-red-600 hover:bg-red-700'
                }
            default:
                return {
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    border: 'border-blue-200 dark:border-blue-800',
                    button: 'bg-accent hover:bg-accent/90'
                }
        }
    }

    const colors = getColors()

    return (
        <DialogContext.Provider value={{ showDialog, alert, confirm }}>
            {children}

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={options.type === 'confirm' ? handleCancel : handleConfirm}
                    />

                    {/* Dialog */}
                    <div className="relative w-full max-w-md animate-scale-in">
                        <div className={`relative bg-white dark:bg-zinc-900 rounded-2xl border shadow-2xl ${colors.border}`}>

                            {/* Close button */}
                            <button
                                onClick={handleCancel}
                                className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-primary hover:bg-sand-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Content */}
                            <div className="p-6">
                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center mb-4`}>
                                    {getIcon()}
                                </div>

                                {/* Title */}
                                {options.title && (
                                    <h3 className="text-lg font-semibold text-primary dark:text-white mb-2">
                                        {options.title}
                                    </h3>
                                )}

                                {/* Message */}
                                <p className="text-secondary dark:text-zinc-300 whitespace-pre-line">
                                    {options.message}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 p-6 pt-0">
                                {options.type === 'confirm' && (
                                    <button
                                        onClick={handleCancel}
                                        className="flex-1 px-4 py-2.5 border border-sand-200 dark:border-zinc-700 rounded-xl font-medium text-secondary dark:text-zinc-300 hover:bg-sand-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        {options.cancelText || 'Cancel'}
                                    </button>
                                )}
                                <button
                                    onClick={handleConfirm}
                                    className={`${options.type === 'confirm' ? 'flex-1' : 'w-full'} px-4 py-2.5 ${colors.button} text-white rounded-xl font-medium transition-colors shadow-lg`}
                                >
                                    {options.confirmText || 'OK'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    )
}

export function useDialog() {
    const context = useContext(DialogContext)
    if (!context) {
        throw new Error('useDialog must be used within DialogProvider')
    }
    return context
}
