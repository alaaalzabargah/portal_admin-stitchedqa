'use client'

import { ChevronLeft, ChevronRight, Send, Users, MessageSquare, Eye } from 'lucide-react'

interface MobileWizardProps {
    currentStep: number
    selectedCount: number
    templateName: string
    languageCode: string
    bodyVariables: any[]
    buttonVariables: any[]
    filteredCustomers: any[]
    goToNextStep: () => void
    goToPreviousStep: () => void
    sendCampaign: () => void
    sending: boolean
    canProceedToStep2: boolean
    canProceedToStep3: boolean
    // Step 1 components
    renderAudienceSelection: () => React.ReactElement
    // Step 2 components
    renderCampaignConfig: () => React.ReactElement
}

export function MobileWizard({
    currentStep,
    selectedCount,
    templateName,
    languageCode,
    bodyVariables,
    buttonVariables,
    filteredCustomers,
    goToNextStep,
    goToPreviousStep,
    sendCampaign,
    sending,
    canProceedToStep2,
    canProceedToStep3,
    renderAudienceSelection,
    renderCampaignConfig
}: MobileWizardProps) {

    // Progress indicator
    const steps = [
        { number: 1, title: 'Audience', icon: Users },
        { number: 2, title: 'Campaign', icon: MessageSquare },
        { number: 3, title: 'Review', icon: Eye }
    ]

    return (
        <div className="space-y-4">
            {/* Progress Indicator */}
            <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-4">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const StepIcon = step.icon
                        const isActive = currentStep === step.number
                        const isCompleted = currentStep > step.number

                        return (
                            <div key={step.number} className="flex items-center flex-1">
                                <div className="flex flex-col items-center flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-accent text-white' :
                                        isCompleted ? 'bg-green-500 text-white' :
                                            'bg-sand-100 text-muted-foreground'
                                        }`}>
                                        <StepIcon className="w-5 h-5" />
                                    </div>
                                    <p className={`text-xs mt-1 font-medium ${isActive ? 'text-accent' : 'text-muted-foreground'
                                        }`}>
                                        {step.title}
                                    </p>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`h-0.5 flex-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-sand-200'
                                        }`} />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">
                {currentStep === 1 && renderAudienceSelection()}
                {currentStep === 2 && renderCampaignConfig()}
                {currentStep === 3 && (
                    <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-4 md:p-6 space-y-6">
                        <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
                            <Eye className="w-5 h-5" />
                            Review & Send
                        </h2>

                        {/* Audience Summary */}
                        <div className="p-4 bg-sand-50 rounded-xl space-y-2">
                            <h3 className="font-medium text-secondary">Selected Audience</h3>
                            <p className="text-2xl font-bold text-accent">{selectedCount} Customers</p>
                            <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                                {filteredCustomers
                                    .slice(0, 5)
                                    .map(c => c.full_name || 'Unnamed')
                                    .join(', ')}
                                {selectedCount > 5 && ` +${selectedCount - 5} more`}
                            </div>
                        </div>

                        {/* Campaign Summary */}
                        <div className="p-4 bg-sand-50 rounded-xl space-y-3">
                            <h3 className="font-medium text-secondary">Campaign Details</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Template:</span>
                                    <span className="font-medium">{templateName || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Language:</span>
                                    <span className="font-medium">{languageCode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Body Variables:</span>
                                    <span className="font-medium">{bodyVariables.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Button Variables:</span>
                                    <span className="font-medium">{buttonVariables.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Preview Message */}
                        <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
                            <p className="text-xs text-muted-foreground mb-2">Message Preview</p>
                            <p className="text-sm text-secondary">
                                Template: <strong>{templateName}</strong>
                            </p>
                            <p className="text-sm text-secondary">
                                Language: <strong>{languageCode}</strong>
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-4">
                <div className="flex gap-3">
                    {currentStep > 1 && (
                        <button
                            onClick={goToPreviousStep}
                            className="flex-1 px-4 py-3 border border-sand-200 rounded-xl font-medium text-secondary hover:bg-sand-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>
                    )}

                    {currentStep < 3 ? (
                        <button
                            onClick={goToNextStep}
                            disabled={
                                (currentStep === 1 && !canProceedToStep2) ||
                                (currentStep === 2 && !canProceedToStep3)
                            }
                            className="flex-1 px-4 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:bg-sand-200 disabled:text-muted-foreground flex items-center justify-center gap-2"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={sendCampaign}
                            disabled={sending}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:bg-sand-200 disabled:text-muted-foreground flex items-center justify-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            {sending ? 'Sending...' : `Send to ${selectedCount} Customers`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
