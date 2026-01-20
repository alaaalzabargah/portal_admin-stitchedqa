'use client'

import { useState } from 'react'
import { User, Ruler, Package } from 'lucide-react'
import { useThemeSystem } from '@/lib/themes/context'

interface CustomerTabsProps {
    tabs: {
        id: string
        label: string
        icon: React.ReactNode
    }[]
    activeTab: string
    onTabChange: (tabId: string) => void
}

export function CustomerTabs({ tabs, activeTab, onTabChange }: CustomerTabsProps) {
    const { themeConfig } = useThemeSystem()

    return (
        <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px overflow-x-auto scrollbar-hide" aria-label="Tabs">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                group relative min-w-0 flex-1 overflow-hidden py-4 px-1
                                text-sm font-semibold text-center whitespace-nowrap
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/20
                                transition-all duration-200 touch-manipulation
                                ${isActive 
                                    ? 'text-primary dark:text-white' 
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }
                            `}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                                    {tab.icon}
                                </span>
                                <span className="hidden sm:inline">{tab.label}</span>
                            </div>
                            
                            {/* Active indicator */}
                            {isActive && (
                                <span
                                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                                    style={{ backgroundColor: themeConfig.colors.primary }}
                                />
                            )}
                        </button>
                    )
                })}
            </nav>
        </div>
    )
}
