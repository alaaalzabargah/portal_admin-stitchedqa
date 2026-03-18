import ReviewLinkGenerator from '@/components/marketing/ReviewLinkGenerator'
import { PageHeader } from '@/components/ui/PageHeader'

export default function ReviewsPage() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
            <PageHeader
                label="REVIEWS"
                title="Review Link Generator"
                subtitle="Generate and copy review links or pre-written messages for any product."
            />
            <ReviewLinkGenerator />
        </div>
    )
}
