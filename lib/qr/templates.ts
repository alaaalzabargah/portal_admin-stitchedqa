/**
 * QR Code Template System
 * Professional templates with pre-configured styles
 */

export type DotType = 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded'
export type CornerSquareType = 'square' | 'extra-rounded' | 'dot'
export type CornerDotType = 'square' | 'dot'

export interface QRDotsOptions {
    type: DotType
    color: string
}

export interface QRCornersSquareOptions {
    type: CornerSquareType
    color: string
}

export interface QRCornersDotOptions {
    type: CornerDotType
    color: string
}

export interface QRBackgroundOptions {
    color: string
}

export interface QRImageOptions {
    hideBackgroundDots: boolean
    imageSize: number
    margin: number
}

export interface QRStyleConfig {
    dotsOptions: QRDotsOptions
    cornersSquareOptions: QRCornersSquareOptions
    cornersDotOptions: QRCornersDotOptions
    backgroundOptions: QRBackgroundOptions
    imageOptions?: QRImageOptions
}

export type TemplateCategory = 'professional' | 'playful' | 'corporate' | 'minimal'

export interface QRTemplate {
    id: string
    name: string
    description: string
    category: TemplateCategory
    thumbnail: string
    config: QRStyleConfig
}

// Built-in Professional Templates
export const QR_TEMPLATES: QRTemplate[] = [
    {
        id: 'professional',
        name: 'Professional',
        description: 'Clean and elegant for business use',
        category: 'professional',
        thumbnail: '💼',
        config: {
            dotsOptions: {
                type: 'square',
                color: '#1F1F1F'
            },
            cornersSquareOptions: {
                type: 'square',
                color: '#C7A02C'
            },
            cornersDotOptions: {
                type: 'square',
                color: '#1F1F1F'
            },
            backgroundOptions: {
                color: '#FFFFFF'
            }
        }
    },
    {
        id: 'playful',
        name: 'Playful',
        description: 'Vibrant and friendly design',
        category: 'playful',
        thumbnail: '🎨',
        config: {
            dotsOptions: {
                type: 'rounded',
                color: '#FF6B6B'
            },
            cornersSquareOptions: {
                type: 'extra-rounded',
                color: '#4ECDC4'
            },
            cornersDotOptions: {
                type: 'dot',
                color: '#FFE66D'
            },
            backgroundOptions: {
                color: '#FFFFFF'
            }
        }
    },
    {
        id: 'corporate',
        name: 'Corporate',
        description: 'Minimalist monochrome for formal settings',
        category: 'corporate',
        thumbnail: '🏢',
        config: {
            dotsOptions: {
                type: 'square',
                color: '#000000'
            },
            cornersSquareOptions: {
                type: 'square',
                color: '#000000'
            },
            cornersDotOptions: {
                type: 'square',
                color: '#000000'
            },
            backgroundOptions: {
                color: '#FFFFFF'
            }
        }
    },
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'Soft and modern aesthetic',
        category: 'minimal',
        thumbnail: '✨',
        config: {
            dotsOptions: {
                type: 'extra-rounded',
                color: '#6366F1'
            },
            cornersSquareOptions: {
                type: 'extra-rounded',
                color: '#8B5CF6'
            },
            cornersDotOptions: {
                type: 'dot',
                color: '#6366F1'
            },
            backgroundOptions: {
                color: '#F9FAFB'
            }
        }
    }
]

export function getTemplate(id: string): QRTemplate | undefined {
    return QR_TEMPLATES.find(t => t.id === id)
}

export function getDefaultTemplate(): QRTemplate {
    return QR_TEMPLATES[0]
}
