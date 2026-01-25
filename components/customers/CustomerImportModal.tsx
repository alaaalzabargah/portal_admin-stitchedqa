'use client'

import { useState, useRef, useCallback } from 'react'
import {
    X, Upload, FileSpreadsheet, CheckCircle, AlertCircle,
    Loader2, Download, ChevronDown, ChevronRight, AlertTriangle
} from 'lucide-react'
import { GlassButton } from '@/components/ui/GlassButton'

interface ImportResult {
    success: boolean
    total: number
    imported: number
    skipped: number
    errors: Array<{ row: number; phone?: string; error: string }>
    logs: string[]
}

interface CustomerImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CustomerImportModal({ isOpen, onClose, onSuccess }: CustomerImportModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<ImportResult | null>(null)
    const [showLogs, setShowLogs] = useState(false)
    const [showErrors, setShowErrors] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const resetState = useCallback(() => {
        setFile(null)
        setResult(null)
        setShowLogs(false)
        setShowErrors(false)
    }, [])

    const handleClose = () => {
        if (!uploading) {
            resetState()
            onClose()
        }
    }

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)

        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && isValidFile(droppedFile)) {
            setFile(droppedFile)
            setResult(null)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile && isValidFile(selectedFile)) {
            setFile(selectedFile)
            setResult(null)
        }
    }

    const isValidFile = (file: File): boolean => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'application/vnd.ms-excel', // xls
            'text/csv'
        ]
        return validTypes.includes(file.type) ||
            file.name.endsWith('.xlsx') ||
            file.name.endsWith('.xls') ||
            file.name.endsWith('.csv')
    }

    const handleImport = async () => {
        if (!file) return

        setUploading(true)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/customers/import', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (data.result) {
                setResult(data.result)
                if (data.result.imported > 0) {
                    onSuccess()
                }
            } else if (data.error) {
                setResult({
                    success: false,
                    total: 0,
                    imported: 0,
                    skipped: 0,
                    errors: [{ row: 0, error: data.error }],
                    logs: []
                })
            }
        } catch (error: any) {
            setResult({
                success: false,
                total: 0,
                imported: 0,
                skipped: 0,
                errors: [{ row: 0, error: error.message || 'Upload failed' }],
                logs: []
            })
        } finally {
            setUploading(false)
        }
    }

    const downloadTemplate = () => {
        // Create template CSV
        const headers = [
            'phone',
            'full_name',
            'email',
            'standard_size',
            'height_cm',
            'shoulder_width_cm',
            'bust_cm',
            'waist_cm',
            'hips_cm',
            'sleeve_length_cm',
            'product_length_cm',
            'arm_hole_cm',
            'measurement_type',
            'notes'
        ]

        const exampleRow = [
            '97412345678',
            'Sara Ahmed',
            'sara@example.com',
            'm',
            '165',
            '40',
            '90',
            '70',
            '95',
            '60',
            '140',
            '22',
            'custom',
            'Regular customer'
        ]

        const csvContent = [
            headers.join(','),
            exampleRow.join(',')
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'customer_import_template.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/95 via-white/90 to-white/85 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">

                    {/* Decorative */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl" />

                    {/* Header */}
                    <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-sand-200/50">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-primary">Import Customers</h2>
                                <p className="text-xs sm:text-sm text-muted-foreground">Upload Excel or CSV file</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={uploading}
                            className="p-2 hover:bg-sand-100 rounded-xl transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="relative p-4 sm:p-6 space-y-4 sm:space-y-6">

                        {/* Template Download */}
                        <div className="flex items-center justify-between p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Download className="w-5 h-5 text-blue-600" />
                                <div>
                                    <p className="font-medium text-sm text-blue-700">Need a template?</p>
                                    <p className="text-xs text-blue-600/70">Download with correct column order</p>
                                </div>
                            </div>
                            <button
                                onClick={downloadTemplate}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Download
                            </button>
                        </div>

                        {/* Drop Zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${dragOver
                                ? 'border-emerald-500 bg-emerald-50'
                                : file
                                    ? 'border-emerald-400 bg-emerald-50/50'
                                    : 'border-sand-300 hover:border-sand-400'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {file ? (
                                <div className="space-y-2">
                                    <FileSpreadsheet className="w-12 h-12 mx-auto text-emerald-600" />
                                    <p className="font-semibold text-primary">{file.name}</p>
                                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
                                        className="text-sm text-red-600 hover:text-red-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Upload className="w-12 h-12 mx-auto text-muted-foreground/50" />
                                    <p className="font-medium text-primary">
                                        Drop your file here or <span className="text-emerald-600">browse</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">Supports Excel (.xlsx, .xls) and CSV files</p>
                                </div>
                            )}
                        </div>

                        {/* Progress / Result */}
                        {uploading && (
                            <div className="flex items-center justify-center gap-3 p-4 bg-sand-100 rounded-xl">
                                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                                <span className="font-medium text-primary">Importing customers...</span>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-4">
                                {/* Summary */}
                                <div className={`p-4 rounded-xl border ${result.success
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : 'bg-amber-50 border-amber-200'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        {result.imported > 0 ? (
                                            <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                                        ) : (
                                            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                                        )}
                                        <div className="flex-1">
                                            <p className="font-semibold text-primary">
                                                {result.imported > 0
                                                    ? `Successfully imported ${result.imported} customers`
                                                    : 'No customers imported'
                                                }
                                            </p>
                                            <div className="flex flex-wrap gap-4 mt-2 text-sm">
                                                <span className="text-muted-foreground">Total rows: <strong>{result.total}</strong></span>
                                                <span className="text-emerald-600">Imported: <strong>{result.imported}</strong></span>
                                                <span className="text-amber-600">Skipped: <strong>{result.skipped}</strong></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Errors */}
                                {result.errors.length > 0 && (
                                    <div className="border border-red-200 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setShowErrors(!showErrors)}
                                            className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-red-600" />
                                                <span className="font-medium text-red-700 text-sm">
                                                    {result.errors.length} {result.errors.length === 1 ? 'Error' : 'Errors'}
                                                </span>
                                            </div>
                                            {showErrors ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                        {showErrors && (
                                            <div className="max-h-40 overflow-y-auto divide-y divide-red-100">
                                                {result.errors.map((err, idx) => (
                                                    <div key={idx} className="px-3 py-2 text-sm">
                                                        <span className="text-red-600 font-medium">
                                                            {err.row > 0 ? `Row ${err.row}` : 'Error'}
                                                            {err.phone && ` (${err.phone})`}:
                                                        </span>
                                                        <span className="text-muted-foreground ml-2">{err.error}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Logs */}
                                {result.logs.length > 0 && (
                                    <div className="border border-sand-200 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setShowLogs(!showLogs)}
                                            className="w-full flex items-center justify-between p-3 bg-sand-50 hover:bg-sand-100 transition-colors"
                                        >
                                            <span className="font-medium text-sm text-secondary">Import Logs</span>
                                            {showLogs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                        {showLogs && (
                                            <div className="max-h-32 overflow-y-auto p-3 bg-zinc-900 text-zinc-300 font-mono text-xs">
                                                {result.logs.map((log, idx) => (
                                                    <div key={idx} className="py-0.5">{log}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Column Order Info */}
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p className="font-semibold">Required columns:</p>
                            <p><strong>phone</strong> (required, unique)</p>
                            <p className="font-semibold mt-2">Optional columns:</p>
                            <p>full_name, email, standard_size, height_cm, shoulder_width_cm, bust_cm, waist_cm, hips_cm, sleeve_length_cm, product_length_cm, arm_hole_cm, measurement_type, notes</p>
                            <p className="text-xs text-muted-foreground/70 mt-2 italic">Note: Status tier is calculated automatically based on spending.</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="relative p-4 sm:p-6 pt-0 flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <GlassButton
                            variant="ghost"
                            size="sm"
                            onClick={handleClose}
                            disabled={uploading}
                            className="flex-1 order-2 sm:order-1"
                        >
                            {result?.imported ? 'Close' : 'Cancel'}
                        </GlassButton>
                        <GlassButton
                            variant="success"
                            size="sm"
                            onClick={handleImport}
                            disabled={!file || uploading}
                            isLoading={uploading}
                            leftIcon={<Upload className="w-4 h-4" />}
                            className="flex-1 order-1 sm:order-2"
                        >
                            Import Customers
                        </GlassButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
