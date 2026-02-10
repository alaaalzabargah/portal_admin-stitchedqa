'use client'

import { ChevronLeft, ChevronRight, Send } from 'lucide-react'

interface WizardNavigationProps {
    currentStep: number
    onPrevious: () => void
    onNext: () => void
    onSend: () => void
    canProceed: boolean
    sending: boolean
}

export function WizardNavigation({
    currentStep,
    onPrevious,
    onNext,
    onSend,
    canProceed,
    sending
}: WizardNavigationProps) {
    const isFirstStep = currentStep === 1
    const isLastStep = currentStep === 3

    return (
        <div className="sticky bottom-0 bg-white border-t border-sand-200 p-4 flex items-center justify-between gap-3 shadow-lg">
            {/* Back Button */}
            <button
                type="button"
                onClick={onPrevious}
                disabled={isFirstStep}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${isFirstStep
                        ? 'opacity-0 pointer-events-none'
                        : 'bg-white border-2 border-sand-200 text-gray-700 hover:bg-sand-50'
                    }`}
            >
                <ChevronLeft className="w-5 h-5" />
                Back
            </button>

            {/* Step Counter */}
            <div className="text-sm text-muted-foreground">
                Step {currentStep} of 3
            </div>

            {/* Next/Send Button */}
            {isLastStep ? (
                <button
                    type="button"
                    onClick={onSend}
                    disabled={!canProceed || sending}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all ${canProceed && !sending
                            ? 'bg-accent text-white hover:bg-accent/90'
                            : 'bg-sand-200 text-muted-foreground cursor-not-allowed'
                        }`}
                >
                    {sending ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Send
                        </>
                    )}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!canProceed}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all ${canProceed
                            ? 'bg-accent text-white hover:bg-accent/90'
                            : 'bg-sand-200 text-muted-foreground cursor-not-allowed'
                        }`}
                >
                    Next
                    <ChevronRight className="w-5 h-5" />
                </button>
            )}
        </div>
    )
}
