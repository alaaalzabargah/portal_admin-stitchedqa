import { createClient } from '@/lib/supabase/server'
import { CustomerPageClient } from './CustomerPageClient'
import { getDictionary } from '@/lib/i18n/config'
import { cookies } from 'next/headers'

export default async function CustomersPage({
    searchParams,
}: {
    searchParams?: Promise<{
        q?: string
        page?: string
    }>
}) {
    const supabase = await createClient()
    const params = await searchParams
    const query = params?.q || ''

    const cookieStore = await cookies()
    const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'ar' | 'en'
    const dict = await getDictionary(locale)

    let dbQuery = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

    if (query) {
        dbQuery = dbQuery.or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    }

    // Fetch Loyalty Tiers
    const { data: tiers } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .order('min_spend_minor', { ascending: true })

    const { data: customers, error } = await dbQuery

    if (error) {
        console.error('Error fetching customers:', error)
        return <div className="p-8 text-red-500">Failed to load customers.</div>
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">

            {/* Client Wrapper */}
            <CustomerPageClient customers={customers || []} tiers={tiers || []} dict={dict} />
        </div>
    )
}
