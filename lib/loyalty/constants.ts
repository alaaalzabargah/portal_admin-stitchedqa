/**
 * Loyalty Tier Constants
 * System-level constants for loyalty tier management
 */

/**
 * Default tier assigned to new customers
 * This tier is system-managed and cannot be modified or deleted
 */
export const DEFAULT_TIER = {
    name: 'Guest',
    minSpend: 0,
    isSystem: true,
    defaultColor: '#9CA3AF'
} as const

/**
 * Reserved tier names that cannot be used by users
 */
export const RESERVED_TIER_NAMES = ['Guest'] as const

/**
 * Minimum spend requirement for user-created tiers
 * System tiers can have min_spend = 0, but user tiers must be > 0
 */
export const MIN_SPEND_FOR_USER_TIERS = 1

/**
 * Validation: Check if tier name is reserved
 */
export function isReservedTierName(name: string): boolean {
    return RESERVED_TIER_NAMES.includes(name as any)
}

/**
 * Validation: Check if min spend is valid for user-created tier
 */
export function isValidMinSpend(minSpend: number, isSystem: boolean = false): boolean {
    if (isSystem) return minSpend >= 0
    return minSpend >= MIN_SPEND_FOR_USER_TIERS
}
