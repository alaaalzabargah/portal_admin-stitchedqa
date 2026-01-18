/**
 * API Validation Schemas
 * Zod schemas for API request validation
 */

import { z } from 'zod'

// All available user roles
const UserRoleEnum = z.enum(['owner', 'admin', 'manager', 'editor', 'viewer'])

export const UpdateUserSchema = z.object({
    display_name: z.string().min(1).max(100).optional(),
    role: UserRoleEnum.optional(),
    is_active: z.boolean().optional(),
})

export const InviteUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    role: UserRoleEnum.default('viewer'),
    display_name: z.string().min(1).max(100).optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type InviteUserInput = z.infer<typeof InviteUserSchema>

