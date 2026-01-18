import { createClient } from '@/lib/supabase/server'
import { CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

export default async function WebhookTestPage() {
    const supabase = await createClient()

    const { data: events, error } = await supabase
        .from('webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) {
        return (
            <div className="p-8 text-red-500">
                <h1 className="text-2xl font-bold mb-4">Webhook Error</h1>
                <pre>{JSON.stringify(error, null, 2)}</pre>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif text-primary">Webhook Logs</h1>
                    <p className="text-muted-foreground mt-1">Real-time log of incoming Shopify webhooks</p>
                </div>
                <div className="text-sm text-muted-foreground">
                    Showing last 50 events
                </div>
            </div>

            <div className="bg-white rounded-xl border border-sand-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-sand-100 bg-sand-50/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-3">Topic</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-3">Resource ID</div>
                    <div className="col-span-3">Time</div>
                    <div className="col-span-1 text-right">Raw</div>
                </div>

                <div className="divide-y divide-sand-100">
                    {events?.map((event) => (
                        <WebhookRow key={event.id} event={event} />
                    ))}
                    {(!events || events.length === 0) && (
                        <div className="p-8 text-center text-muted-foreground">
                            No webhook events found yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function WebhookRow({ event }: { event: any }) {
    return (
        <div className="group hover:bg-sand-50/50 transition-colors">
            <div className="grid grid-cols-12 gap-4 p-4 items-center">
                <div className="col-span-3 font-mono text-sm text-primary truncate" title={event.topic}>
                    {event.topic}
                </div>
                <div className="col-span-2">
                    <StatusBadge status={event.status} />
                </div>
                <div className="col-span-3 font-mono text-xs text-secondary truncate" title={event.resource_id}>
                    {event.resource_id || '-'}
                </div>
                <div className="col-span-3 text-sm text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                </div>
                <div className="col-span-1 text-right">
                    <details className="group/details relative">
                        <summary className="list-none cursor-pointer p-2 hover:bg-sand-100 rounded-lg inline-flex">
                            <ChevronDown className="w-4 h-4 text-secondary group-open/details:rotate-180 transition-transform" />
                        </summary>
                        <div className="absolute right-0 top-full mt-2 w-96 p-4 bg-gray-900 text-gray-50 rounded-xl shadow-xl z-50 overflow-auto max-h-96 text-xs font-mono">
                            <div className="mb-2 text-gray-400 font-semibold border-b border-gray-700 pb-1">Payload Preview</div>
                            <pre>{JSON.stringify(event.raw_payload, null, 2)}</pre>
                            {event.error_message && (
                                <div className="mt-4 pt-4 border-t border-red-900/50 text-red-300">
                                    <div className="font-bold mb-1">Error:</div>
                                    {event.error_message}
                                </div>
                            )}
                        </div>
                    </details>
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'processed') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3 h-3" /> Processed
            </span>
        )
    }
    if (status === 'failed') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                <XCircle className="w-3 h-3" /> Failed
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Received
        </span>
    )
}
