'use client'

import { MessageSquare } from 'lucide-react'

interface AdditionalCommentsProps {
    comments?: string | null
    dict: any
}

export function AdditionalComments({ comments, dict }: AdditionalCommentsProps) {
    if (!comments) {
        return null
    }

    return (
        <div
            className="rounded-3xl p-5 sm:p-6 shadow-lg border"
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderColor: 'rgba(255, 255, 255, 0.3)'
            }}
        >
            <div className="flex items-center gap-3 mb-4">
                <div
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center"
                    style={{
                        background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-to))'
                    }}
                >
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--theme-accent)' }} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary dark:text-white">
                    {dict.customer_details?.additional_comments || 'Additional Comments'}
                </h3>
            </div>
            <div className="prose prose-sm max-w-none">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {comments}
                </p>
            </div>
        </div>
    )
}
