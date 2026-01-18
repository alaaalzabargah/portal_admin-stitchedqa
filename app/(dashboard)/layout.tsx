import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { DashboardContent } from '@/components/layout/DashboardContent'
import { CurrencyProvider } from '@/lib/settings'
import { AuthProvider } from '@/lib/auth'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthProvider>
            <CurrencyProvider>
                <div className="min-h-screen flex text-foreground font-sans relative bg-white">
                    {/* Pure white background for Clean Luxury design */}

                    <Sidebar />
                    <MobileNav />
                    <DashboardContent>
                        {children}
                    </DashboardContent>
                </div>
            </CurrencyProvider>
        </AuthProvider>
    )
}

