/**
 * Error Message Utilities
 * Provides bilingual, user-friendly error messages for tier management
 */

export interface TierError {
    en: string
    ar: string
}

/**
 * Parse database error messages and return user-friendly bilingual messages
 */
export function parseTierError(errorMessage: string): TierError {
    const msg = errorMessage.toLowerCase()

    // Guest tier protection errors
    if (msg.includes('cannot delete the guest tier')) {
        return {
            en: 'Cannot delete the Guest tier - it is required for new customers.',
            ar: 'لا يمكن حذف مستوى الضيف - مطلوب للعملاء الجدد.'
        }
    }

    if (msg.includes('cannot rename the guest tier')) {
        return {
            en: 'Cannot rename the Guest tier - use Settings to change the default tier name.',
            ar: 'لا يمكن إعادة تسمية مستوى الضيف - استخدم الإعدادات لتغيير اسم المستوى الافتراضي.'
        }
    }

    if (msg.includes('cannot make guest tier non-system')) {
        return {
            en: 'Cannot modify Guest tier - it is system-managed.',
            ar: 'لا يمكن تعديل مستوى الضيف - يتم إدارته من قبل النظام.'
        }
    }

    if (msg.includes('guest tier must have min_spend = 0')) {
        return {
            en: 'Guest tier must have minimum spend of 0.',
            ar: 'يجب أن يكون الحد الأدنى للإنفاق لمستوى الضيف 0.'
        }
    }

    if (msg.includes('cannot create a tier named "guest"')) {
        return {
            en: 'The name "Guest" is reserved for the default tier.',
            ar: 'اسم "ضيف" محجوز للمستوى الافتراضي.'
        }
    }

    // Min spend violation
    if (msg.includes('check_non_system_min_spend')) {
        return {
            en: 'User-created tiers must have a minimum spend greater than 0. Only the Guest tier can have 0.',
            ar: 'المستويات التي ينشئها المستخدم يجب أن يكون لها حد أدنى للإنفاق أكبر من 0. فقط مستوى الضيف يمكن أن يكون 0.'
        }
    }

    // Duplicate name
    if (msg.includes('duplicate') || msg.includes('already exists')) {
        return {
            en: 'A tier with this name already exists.',
            ar: 'يوجد مستوى بهذا الاسم بالفعل.'
        }
    }

    // Foreign key violation (tier in use)
    if (msg.includes('foreign key') || msg.includes('still referenced')) {
        return {
            en: 'Cannot delete this tier because customers are currently assigned to it.',
            ar: 'لا يمكن حذف هذا المستوى لأن هناك عملاء مسجلين فيه حاليًا.'
        }
    }

    // Generic fallback
    return {
        en: `Error: ${errorMessage}`,
        ar: `خطأ: ${errorMessage}`
    }
}

/**
 * Get localized error message
 */
export function getLocalizedTierError(errorMessage: string, locale: 'ar' | 'en' = 'ar'): string {
    const error = parseTierError(errorMessage)
    return locale === 'ar' ? error.ar : error.en
}
