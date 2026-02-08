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

interface BodyVariable {
    position: number
    value: string
    source: 'static' | 'customer_name' | 'customer_phone' | 'collection_name'
}

interface TemplateConfig {
    bodyVariableCount: number
    buttonVariableCount: number
}

interface ButtonVariable {
    buttonIndex: number
    urlSuffix: string
    source: 'static' | 'collection_slug'
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
    const [languageCode, setLanguageCode] = useState('ar')
    const [headerImageUrl, setHeaderImageUrl] = useState('')
    const [bodyVariables, setBodyVariables] = useState<BodyVariable[]>([])
    const [buttonVariables, setButtonVariables] = useState<ButtonVariable[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)

    // Send State
    const [sending, setSending] = useState(false)
    const [logs, setLogs] = useState<LogEntry[]>([])

    // Saved Templates and Configurations
    const [savedTemplates, setSavedTemplates] = useState<string[]>([])
    const [templateConfigs, setTemplateConfigs] = useState<Record<string, TemplateConfig>>({})

    // Load saved templates and configs on mount
    useEffect(() => {
        const saved = localStorage.getItem('saved_templates')
        if (saved) {
            try {
                setSavedTemplates(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to parse saved templates', e)
            }
        }

        const configs = localStorage.getItem('template_configs')
        if (configs) {
            try {
                setTemplateConfigs(JSON.parse(configs))
            } catch (e) {
                console.error('Failed to parse template configs', e)
            }
        }
    }, [])

    // Save template to history and config
    const saveToHistory = (name: string, bodyCount: number, buttonCount: number) => {
        setSavedTemplates(prev => {
            if (prev.includes(name)) return prev
            const newHistory = [name, ...prev].slice(0, 10) // Limit to 10 recent
            localStorage.setItem('saved_templates', JSON.stringify(newHistory))
            return newHistory
        })

        // Save template configuration
        setTemplateConfigs(prev => {
            const newConfigs = {
                ...prev,
                [name]: { bodyVariableCount: bodyCount, buttonVariableCount: buttonCount }
            }
            localStorage.setItem('template_configs', JSON.stringify(newConfigs))
            return newConfigs
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

    // Body Variable functions
    const addBodyVariable = () => {
        setBodyVariables([
            ...bodyVariables,
            { position: bodyVariables.length + 1, value: '', source: 'customer_name' }
        ])
    }

    const removeBodyVariable = (index: number) => {
        setBodyVariables(bodyVariables.filter((_, i) => i !== index))
    }

    const updateBodyVariable = (index: number, field: keyof BodyVariable, value: string) => {
        const newVars = [...bodyVariables]
        if (field === 'source') {
            newVars[index].source = value as BodyVariable['source']
        } else if (field === 'value') {
            newVars[index].value = value
        }
        setBodyVariables(newVars)
    }

    // Button Variable functions
    const addButtonVariable = () => {
        setButtonVariables([
            ...buttonVariables,
            { buttonIndex: buttonVariables.length, urlSuffix: '', source: 'static' }
        ])
    }

    const removeButtonVariable = (index: number) => {
        setButtonVariables(buttonVariables.filter((_, i) => i !== index))
    }

    const updateButtonVariable = (index: number, field: keyof ButtonVariable, value: string) => {
        const newVars = [...buttonVariables]
        if (field === 'urlSuffix') {
            newVars[index].urlSuffix = value
        } else if (field === 'source') {
            newVars[index].source = value as ButtonVariable['source']
        }
        setButtonVariables(newVars)
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
            // Validate that all variables have values (prevent parameter format mismatch)
            const invalidBodyVars = bodyVariables.filter(v =>
                (v.source === 'static' || v.source === 'collection_name') && !v.value.trim()
            )
            const invalidButtonVars = buttonVariables.filter(v => !v.urlSuffix.trim())

            if (invalidBodyVars.length > 0) {
                await dialog.alert(
                    `Please fill in all body variable values. Empty variables at positions: ${invalidBodyVars.map(v => v.position).join(', ')}`,
                    'Incomplete Variables'
                )
                setSending(false)
                return
            }

            if (invalidButtonVars.length > 0) {
                await dialog.alert(
                    `Please fill in all button URL suffixes. Empty buttons at indices: ${invalidButtonVars.map(v => v.buttonIndex).join(', ')}`,
                    'Incomplete Variables'
                )
                setSending(false)
                return
            }

            const response = await fetch('/api/marketing/send-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customers: selectedCustomers,
                    templateName: templateName.trim(),
                    languageCode,
                    headerImageUrl: headerImageUrl.trim() || undefined,
                    // Send all variables in their original positions - don't filter!
                    bodyVariables: bodyVariables,
                    buttonVariables: buttonVariables
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

                // Save template config if successful
                if (data.summary && data.summary.sent > 0) {
                    saveToHistory(
                        templateName.trim(),
                        bodyVariables.length,
                        buttonVariables.length
                    )
                    // Clear values but keep structure
                    setBodyVariables(bodyVariables.map(v => ({ ...v, value: '' })))
                    setButtonVariables(buttonVariables.map(v => ({ ...v, urlSuffix: '' })))
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
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 md:px-8 pb-20 md:pb-8">
            {/* Header */}
            <PageHeader
                label="MARKETING"
                title={t('marketing.title')}
                subtitle={t('marketing.subtitle')}
            />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">

                {/* Left Column: Customer Selection */}
                <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-4 md:p-6 space-y-4">
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
                    <div className="flex flex-col sm:flex-row gap-3">
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
                    <div className="max-h-[600px] md:max-h-[600px] lg:max-h-[500px] overflow-y-auto space-y-1 custom-scrollbar pr-1">
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
                                    className={`flex items-center gap-3 p-4 md:p-3 rounded-xl cursor-pointer transition-all ${selectedIds.has(customer.id)
                                        ? 'bg-accent/10 border border-accent/30'
                                        : 'hover:bg-sand-50 border border-transparent'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(customer.id)}
                                        onChange={() => toggleCustomer(customer.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 rounded border-sand-300 text-accent focus:ring-accent shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-primary truncate text-sm md:text-base">
                                            {customer.full_name || 'Unnamed'}
                                        </p>
                                        <p className="text-xs md:text-sm text-muted-foreground" dir="ltr">
                                            {customer.phone}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] md:text-xs text-muted-foreground">
                                            {customer.order_count || 0} {t('customer_details.orders')}
                                        </p>
                                        {customer.status_tier && (
                                            <span className="text-[10px] md:text-xs px-2 py-0.5 bg-sand-100 rounded-full inline-block mt-0.5">
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
                <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-4 md:p-6 space-y-6">
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
                                className={`w-full ${direction === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-sand-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-all text-left`}
                                dir="ltr"
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

                                                            // Auto-load saved configuration
                                                            const config = templateConfigs[name]
                                                            if (config) {
                                                                // Create empty body variables
                                                                const emptyBodyVars: BodyVariable[] = Array.from(
                                                                    { length: config.bodyVariableCount },
                                                                    (_, i) => ({ position: i + 1, value: '', source: 'customer_name' as const })
                                                                )
                                                                setBodyVariables(emptyBodyVars)

                                                                // Create empty button variables
                                                                const emptyButtonVars: ButtonVariable[] = Array.from(
                                                                    { length: config.buttonVariableCount },
                                                                    (_, i) => ({ buttonIndex: i, urlSuffix: '', source: 'static' as const })
                                                                )
                                                                setButtonVariables(emptyButtonVars)
                                                            }
                                                        }}
                                                        className="flex items-center gap-3 flex-1 text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                            {index + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-primary group-hover:text-accent transition-colors truncate">
                                                                {name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Click to use
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
                                                        title="Remove"
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
                                            `Are you sure you want to clear all ${savedTemplates.length} saved template${savedTemplates.length > 1 ? 's' : ''}?`,
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
                                    Clear History
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
                                <option value="ar">Arabic - ar (العربية)</option>
                                <option value="ar_AR">Arabic - ar_AR (العربية - AR)</option>
                                <option value="en_US">English (US) - en_US</option>
                                <option value="en_GB">English (UK) - en_GB</option>
                                <option value="en">English - en</option>
                            </select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            ⚠️ Language code must <strong>exactly match</strong> your template's language in Meta Business Manager
                        </p>
                    </div>

                    {/* Live Preview */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-secondary">
                            Live Preview
                        </label>
                        <div className="p-4 bg-sand-50 rounded-xl border border-sand-200 text-sm text-muted-foreground">
                            <p>This is a live preview of your message.</p>
                            <p>Template: <strong>{templateName || 'N/A'}</strong></p>
                            <p>Language: <strong>{languageCode || 'N/A'}</strong></p>
                            {headerImageUrl && <img src={headerImageUrl} alt="Header Preview" className="mt-2 max-w-full h-auto rounded-md" />}
                            {bodyVariables.length > 0 && (
                                <div className="mt-2">
                                    <p className="font-medium">Body Variables:</p>
                                    {bodyVariables.map((v, i) => (
                                        <p key={i} className="ml-2 text-xs">
                                            {`{{${v.position}}}`}: {v.source === 'static' || v.source === 'collection_name' ? v.value : `(${v.source})`}
                                        </p>
                                    ))}
                                </div>
                            )}
                            {buttonVariables.length > 0 && (
                                <div className="mt-2">
                                    <p className="font-medium">Button Variables:</p>
                                    {buttonVariables.map((v, i) => (
                                        <p key={i} className="ml-2 text-xs">
                                            Button {v.buttonIndex} {"{{1}}"}: {v.urlSuffix}
                                        </p>
                                    ))}
                                </div>
                            )}
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
                                className={`w-full ${direction === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-sand-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent text-left`}
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {/* Body Variables Section */}
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <label className="block text-sm font-medium text-secondary">
                                Body Variables (Text)
                            </label>
                            <button
                                type="button"
                                onClick={addBodyVariable}
                                className="text-sm px-3 py-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors font-medium w-fit"
                            >
                                + Add Body Variable
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Map template placeholders like {"{{1}}"}, {"{{2}}"} to dynamic values.
                        </p>

                        {bodyVariables.map((variable, index) => (
                            <div key={index} className="flex flex-col gap-2 p-3 bg-sand-50 rounded-xl">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                                        {`{{${variable.position}}}`}
                                    </span>
                                    <span className="text-muted-foreground">→</span>
                                    <select
                                        value={variable.source}
                                        onChange={(e) => updateBodyVariable(index, 'source', e.target.value)}
                                        className="flex-1 min-w-[180px] px-3 py-2 border border-sand-200 rounded-lg text-sm bg-white"
                                    >
                                        <option value="customer_name">Customer Name</option>
                                        <option value="customer_phone">Customer Phone</option>
                                        <option value="collection_name">Collection Name (Static)</option>
                                        <option value="static">Other Static Value</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => removeBodyVariable(index)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded ml-auto"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                                {(variable.source === 'static' || variable.source === 'collection_name') && (
                                    <input
                                        type="text"
                                        value={variable.value}
                                        onChange={(e) => updateBodyVariable(index, 'value', e.target.value)}
                                        placeholder={variable.source === 'collection_name' ? 'Collection name' : 'Enter value'}
                                        className="w-full px-3 py-2 border border-sand-200 rounded-lg text-sm"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Button Variables Section (Dynamic URL) */}
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <label className="block text-sm font-medium text-secondary">
                                Button Variables (Dynamic URL)
                            </label>
                            <button
                                type="button"
                                onClick={addButtonVariable}
                                className="text-sm px-3 py-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors font-medium w-fit"
                            >
                                + Add Button Variable
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            For dynamic URL buttons, enter only the <strong>suffix</strong> that will be appended to your template's base URL.
                        </p>

                        {buttonVariables.map((btnVar, index) => (
                            <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-blue-50 rounded-xl">
                                <span className="text-sm font-mono text-blue-600 whitespace-nowrap mb-1 sm:mb-0">
                                    Button {btnVar.buttonIndex} {"{{1}}"}
                                </span>
                                <span className="text-muted-foreground hidden sm:inline">→</span>
                                <input
                                    type="text"
                                    value={btnVar.urlSuffix}
                                    onChange={(e) => updateButtonVariable(index, 'urlSuffix', e.target.value)}
                                    placeholder="URL suffix"
                                    className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                    dir="ltr"
                                />
                                <div className="flex justify-end sm:block mt-1 sm:mt-0">
                                    <button
                                        type="button"
                                        onClick={() => removeButtonVariable(index)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <XCircle className="w-5 h-5 md:w-4 md:h-4" />
                                    </button>
                                </div>
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
