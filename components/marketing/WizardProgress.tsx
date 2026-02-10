'use client'

import { Users, MessageSquare, Eye } from 'lucide-react'

interface WizardProgressProps {
    currentStep: number
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
    const steps = [
        { number: 1, title: 'Audience', icon: Users },
        { number: 2, title: 'Campaign', icon: MessageSquare },
        { number: 3, title: 'Review', icon: Eye }
    ]

    return (
        <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-4 mb-4">
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
    )
}
