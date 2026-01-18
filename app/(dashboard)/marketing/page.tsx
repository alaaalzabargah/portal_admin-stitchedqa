'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Send,
    Loader2,
    CheckCircle,
    XCircle,
    Search,
    Users,
    MessageSquare,
    Image,
    Globe,
    Hash
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/context'
import { useDialog } from '@/lib/dialog'
import { PageHeader } from '@/components/ui/PageHeader'

interface Customer {
    id: string
    full_name: string
    phone: string
    order_count: number
    status_tier: string
}

interface LogEntry {
    id: string
    phone: string
    status: 'success' | 'error' | 'pending'
    message: string
    timestamp: Date
}

interface Variable {
    position: number
    value: string
    source: 'static' | 'customer_name' | 'customer_phone'
}

export default function MarketingPage() {
    const supabase = createClient()
    const { t, direction } = useLanguage()
    const dialog = useDialog()

    // Customer Selection State
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [tierFilter, setTierFilter] = useState<string>('all')
    const [loading, setLoading] = useState(true)

    // Campaign State
    const [templateName, setTemplateName] = useState('')
    const [languageCode, setLanguageCode] = useState('en_US')
    const [headerImageUrl, setHeaderImageUrl] = useState('')
    const [variables, setVariables] = useState<Variable[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)

    // Send State
    const [sending, setSending] = useState(false)
    const [logs, setLogs] = useState<LogEntry[]>([])

    // Saved Templates
    const [savedTemplates, setSavedTemplates] = useState<string[]>([])

    // Load saved templates on mount
    useEffect(() => {
        const saved = localStorage.getItem('saved_templates')
        if (saved) {
            try {
                setSavedTemplates(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to parse saved templates', e)
            }
        }
    }, [])

    // Save template to history
    const saveToHistory = (name: string) => {
        setSavedTemplates(prev => {
            if (prev.includes(name)) return prev
            const newHistory = [name, ...prev].slice(0, 10) // Limit to 10 recent
            localStorage.setItem('saved_templates', JSON.stringify(newHistory))
            return newHistory
        })
    }

    // Load customers
    useEffect(() => {
        async function loadCustomers() {
            const { data, error } = await supabase
                .from('customers')
                .select('id, full_name, phone, order_count, status_tier')
                .order('created_at', { ascending: false })

            if (!error && data) {
                setCustomers(data)
            }
            setLoading(false)
        }
        loadCustomers()
    }, [])

    // Filter customers
    const filteredCustomers = customers.filter(c => {
        const matchesSearch = !searchQuery ||
            c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone?.includes(searchQuery)
        const matchesTier = tierFilter === 'all' || c.status_tier === tierFilter
        return matchesSearch && matchesTier
    })

    // Toggle selection
    const toggleCustomer = (id: string) => {
        const newSelection = new Set(selectedIds)
        if (newSelection.has(id)) {
            newSelection.delete(id)
        } else {
            newSelection.add(id)
        }
        setSelectedIds(newSelection)
    }

    // Select all visible
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredCustomers.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredCustomers.map(c => c.id)))
        }
    }

    // Add variable
    const addVariable = () => {
        setVariables([
            ...variables,
            { position: variables.length + 1, value: '', source: 'static' }
        ])
    }

    // Remove variable
    const removeVariable = (index: number) => {
        setVariables(variables.filter((_, i) => i !== index))
    }

    // Update variable
    const updateVariable = (index: number, field: keyof Variable, value: string) => {
        const newVars = [...variables]
        if (field === 'source') {
            newVars[index].source = value as Variable['source']
        } else if (field === 'value') {
            newVars[index].value = value
        }
        setVariables(newVars)
    }

    // Send campaign
    const sendCampaign = async () => {
        if (selectedIds.size === 0) {
            await dialog.alert('Please select at least one customer', 'No Customers Selected')
            return
        }
        if (!templateName.trim()) {
            await dialog.alert('Please enter a template name', 'Template Name Required')
            return
        }

        setSending(true)
        setLogs([])

        // Build customer payload
        const selectedCustomers = customers
            .filter(c => selectedIds.has(c.id))
            .map(c => ({
                id: c.id,
                name: c.full_name || 'Customer',
                phone: c.phone
            }))

        // Add pending logs
        const pendingLogs = selectedCustomers.map(c => ({
            id: c.id,
            phone: c.phone,
            status: 'pending' as const,
            message: t('marketing.sending'),
            timestamp: new Date()
        }))
        setLogs(pendingLogs)

        try {
            const response = await fetch('/api/marketing/send-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customers: selectedCustomers,
                    templateName: templateName.trim(),
                    languageCode,
                    headerImageUrl: headerImageUrl.trim() || undefined,
                    variables: variables.filter(v => v.source !== 'static' || v.value.trim())
                })
            })

            const data = await response.json()

            if (data.results) {
                // Update logs with results
                const resultLogs: LogEntry[] = data.results.map((r: any, i: number) => ({
                    id: `result-${i}`,
                    phone: r.phone,
                    status: r.status,
                    message: r.message,
                    timestamp: new Date()
                }))
                setLogs(resultLogs)

                // Save template if successful
                if (data.summary && data.summary.sent > 0) {
                    saveToHistory(templateName.trim())
                }
            }

        } catch (error) {
            console.error('Campaign send failed:', error)
            setLogs([{
                id: 'error',
                phone: '',
                status: 'error',
                message: 'Failed to send campaign. Check console for details.',
                timestamp: new Date()
            }])
        }

        setSending(false)
    }

    // Get unique tiers
    const uniqueTiers = Array.from(new Set(customers.map(c => c.status_tier).filter(Boolean)))

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <PageHeader
                label="MARKETING"
                title={t('marketing.title')}
                subtitle={t('marketing.subtitle')}
            />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column: Customer Selection */}
                <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-primary/10 rounded-xl">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-semibold text-primary">{t('marketing.audience')}</h2>
                        <span className="ml-auto px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-medium">
                            {selectedIds.size} {t('marketing.selected')}
                        </span>
                    </div>

                    {/* Search & Filter */}
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                            <input
                                type="text"
                                placeholder={t('marketing.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full ${direction === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-sand-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent text-sm`}
                            />
                        </div>
                        <select
                            value={tierFilter}
                            onChange={(e) => setTierFilter(e.target.value)}
                            className="px-4 py-2.5 border border-sand-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-white"
                        >
                            <option value="all">{t('marketing.all_tiers')}</option>
                            {uniqueTiers.map(tier => (
                                <option key={tier} value={tier}>{tier}</option>
                            ))}
                        </select>
                    </div>

                    {/* Select All */}
                    <div className="flex items-center gap-3 py-2 border-b border-sand-100">
                        <input
                            type="checkbox"
                            id="selectAll"
                            checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-sand-300 text-accent focus:ring-accent"
                        />
                        <label htmlFor="selectAll" className="text-sm font-medium text-secondary">
                            {t('marketing.select_all')} ({filteredCustomers.length})
                        </label>
                    </div>

                    {/* Customer Table */}
                    <div className="max-h-[400px] overflow-y-auto space-y-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                            </div>
                        ) : filteredCustomers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {t('marketing.no_customers')}
                            </div>
                        ) : (
                            filteredCustomers.map(customer => (
                                <div
                                    key={customer.id}
                                    onClick={() => toggleCustomer(customer.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedIds.has(customer.id)
                                        ? 'bg-accent/10 border border-accent/30'
                                        : 'hover:bg-sand-50 border border-transparent'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(customer.id)}
                                        onChange={() => toggleCustomer(customer.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 rounded border-sand-300 text-accent focus:ring-accent"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-primary truncate">
                                            {customer.full_name || 'Unnamed'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {customer.phone}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">
                                            {customer.order_count || 0} {t('customer_details.orders')}
                                        </p>
                                        {customer.status_tier && (
                                            <span className="text-xs px-2 py-0.5 bg-sand-100 rounded-full">
                                                {customer.status_tier}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Campaign Configuration */}
                <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-green-100 rounded-xl">
                            <MessageSquare className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-primary">{t('marketing.campaign')}</h2>
                    </div>

                    {/* Template Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-secondary">
                            {t('marketing.template_name')} *
                        </label>
                        <div className="relative">
                            <Hash className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10`} />
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                onFocus={() => savedTemplates.length > 0 && setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                placeholder="e.g., hello_world"
                                className={`w-full ${direction === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-sand-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-all`}
                            />

                            {/* Custom Suggestions Dropdown */}
                            {showSuggestions && savedTemplates.length > 0 && (
                                <div
                                    className="absolute z-20 w-full mt-2 rounded-xl border border-sand-200 shadow-lg overflow-hidden animate-fade-in"
                                    style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)',
                                    }}
                                >
                                    <div className="px-3 py-2 bg-sand-50 border-b border-sand-100">
                                        <p className="text-xs font-medium text-muted-foreground">Recent Templates</p>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {savedTemplates
                                            .filter(name => name.toLowerCase().includes(templateName.toLowerCase()))
                                            .map((name, index) => (
                                                <div
                                                    key={name}
                                                    className="w-full px-4 py-3 hover:bg-accent/10 transition-all flex items-center gap-3 group"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setTemplateName(name)
                                                            setShowSuggestions(false)
                                                        }}
                                                        className="flex items-center gap-3 flex-1 text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                                                            {index + 1}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-primary group-hover:text-accent transition-colors">
                                                                {name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Click to use this template
                                                            </p>
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            const newTemplates = savedTemplates.filter(t => t !== name)
                                                            setSavedTemplates(newTemplates)
                                                            localStorage.setItem('saved_templates', JSON.stringify(newTemplates))
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                                                        title="Remove from history"
                                                    >
                                                        <XCircle className="w-4 h-4 text-red-400 hover:text-red-600" />
                                                    </button>
                                                </div>
                                            ))}
                                        {savedTemplates.filter(name => name.toLowerCase().includes(templateName.toLowerCase())).length === 0 && (
                                            <div className="px-4 py-3 text-center text-sm text-muted-foreground">
                                                No matching templates
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-start gap-3 text-xs">
                            <p className="text-muted-foreground flex-1">
                                {t('marketing.template_hint')}
                            </p>
                            {savedTemplates.length > 0 && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const confirmed = await dialog.confirm(
                                            `Are you sure you want to clear all ${savedTemplates.length} saved template${savedTemplates.length > 1 ? 's' : ''}? This action cannot be undone.`,
                                            'Clear Template History'
                                        )
                                        if (confirmed) {
                                            setSavedTemplates([])
                                            localStorage.removeItem('saved_templates')
                                        }
                                    }}
                                    className="text-red-400 hover:text-red-600 transition-colors font-medium whitespace-nowrap flex items-center gap-1"
                                >
                                    <XCircle className="w-3 h-3" />
                                    Clear All ({savedTemplates.length})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-secondary">
                            {t('marketing.language_code')}
                        </label>
                        <div className="relative">
                            <Globe className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                            <select
                                value={languageCode}
                                onChange={(e) => setLanguageCode(e.target.value)}
                                className={`w-full ${direction === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-sand-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent bg-white appearance-none`}
                            >
                                <option value="en_US">English (US)</option>
                                <option value="en_GB">English (UK)</option>
                                <option value="ar">Arabic</option>
                            </select>
                        </div>
                    </div>

                    {/* Header Image */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-secondary">
                            {t('marketing.header_image')}
                        </label>
                        <div className="relative">
                            <Image className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                            <input
                                type="url"
                                value={headerImageUrl}
                                onChange={(e) => setHeaderImageUrl(e.target.value)}
                                placeholder="https://example.com/promo.jpg"
                                className={`w-full ${direction === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-sand-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent`}
                            />
                        </div>
                    </div>

                    {/* Variable Mapping */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-secondary">
                                {t('marketing.variable_mapping')}
                            </label>
                            <button
                                type="button"
                                onClick={addVariable}
                                className="text-sm text-accent hover:underline"
                            >
                                {t('marketing.add_variable')}
                            </button>
                        </div>

                        {variables.map((variable, index) => (
                            <div key={index} className="flex items-center gap-2 p-3 bg-sand-50 rounded-xl">
                                <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                                    {`{{${variable.position}}}`}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <select
                                    value={variable.source}
                                    onChange={(e) => updateVariable(index, 'source', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-sand-200 rounded-lg text-sm bg-white"
                                >
                                    <option value="customer_name">Customer Name</option>
                                    <option value="customer_phone">Customer Phone</option>
                                    <option value="static">Static Value</option>
                                </select>
                                {variable.source === 'static' && (
                                    <input
                                        type="text"
                                        value={variable.value}
                                        onChange={(e) => updateVariable(index, 'value', e.target.value)}
                                        placeholder="Enter value"
                                        className="flex-1 px-3 py-2 border border-sand-200 rounded-lg text-sm"
                                    />
                                )}
                                {variables.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeVariable(index)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Send Button */}
                    <button
                        onClick={sendCampaign}
                        disabled={sending || selectedIds.size === 0 || !templateName.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-xl font-medium hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('marketing.sending')}
                            </>
                        ) : (
                            <>
                                <Send className={`w-5 h-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
                                {t('marketing.send_button')} ({selectedIds.size})
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Logs Section */}
            {logs.length > 0 && (
                <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-primary mb-4">{t('marketing.log')}</h3>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {logs.map((log, index) => (
                            <div
                                key={log.id || index}
                                className={`flex items-center gap-3 p-3 rounded-lg ${log.status === 'success' ? 'bg-green-50' :
                                    log.status === 'error' ? 'bg-red-50' :
                                        'bg-sand-50'
                                    }`}
                            >
                                {log.status === 'success' ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                ) : log.status === 'error' ? (
                                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                ) : (
                                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${log.status === 'success' ? 'text-green-800' :
                                        log.status === 'error' ? 'text-red-800' :
                                            'text-secondary'
                                        }`}>
                                        {log.message}
                                    </p>
                                    {log.phone && (
                                        <p className="text-xs text-muted-foreground">{log.phone}</p>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {log.timestamp.toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
