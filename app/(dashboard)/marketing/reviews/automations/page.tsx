import { PageHeader } from '@/components/ui/PageHeader'
import AutomationsClient from './AutomationsClient'
import { getStoreSettings, getAutomationQueue, getEligibleOrders } from './actions'

export const dynamic = 'force-dynamic'

export default async function AutomationsPage() {
    const [settings, queue, eligible] = await Promise.all([
        getStoreSettings(),
        getAutomationQueue(),
        getEligibleOrders(),
    ])

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
            <PageHeader
                label="MARKETING AUTOMATIONS"
                title="Review Requests"
                subtitle="Configure when the system automatically sends a beautiful WhatsApp message to your customers asking for a review."
            />

            <AutomationsClient
                settings={settings || { whatsapp_review_delay_minutes: 4320, whatsapp_automation_enabled: true }}
                queue={queue}
                eligibleOrders={eligible}
            />
        </div>
    )
}
