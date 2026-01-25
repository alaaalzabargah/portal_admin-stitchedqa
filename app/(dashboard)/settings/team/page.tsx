'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Plus, Mail, Edit2, Save, X, Loader2, CheckCircle, AlertCircle, Power,
    ChevronDown, Clock, Shield, Eye, Edit, Users, Crown,
    UserCog, Activity, Sparkles, Trash2
} from 'lucide-react'
import { PortalUser, UserRole, USER_ROLE_LEVELS, USER_ROLE_DESCRIPTIONS } from '@/lib/settings'
import { useAuthUser } from '@/lib/auth'
import { InviteUserModal } from '@/components/settings/InviteUserModal'
import { AuditLogEntry, getActionLabel } from '@/lib/audit'
import { GlassButton } from '@/components/ui/GlassButton'
import { useDialog } from '@/lib/dialog' // Added this import
import { PageHeader } from '@/components/ui/PageHeader'
import { useLanguage } from '@/lib/i18n/context'

const ROLE_CONFIG: Record<UserRole, {
    icon: React.ElementType
    color: string
    bgColor: string
    gradient: string
}> = {
    owner: {
        icon: Crown,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        gradient: 'from-purple-500 to-violet-600'
    },
    admin: {
        icon: Shield,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        gradient: 'from-emerald-500 to-teal-600'
    },
    manager: {
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        gradient: 'from-blue-500 to-sky-600'
    },
    editor: {
        icon: Edit,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        gradient: 'from-amber-500 to-orange-600'
    },
    viewer: {
        icon: Eye,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        gradient: 'from-gray-500 to-slate-600'
    }
}

const ROLES_ORDER: UserRole[] = ['owner', 'admin', 'manager', 'editor', 'viewer']

export default function TeamSettingsPage() {
    const [users, setUsers] = useState<PortalUser[]>([])
    const [loading, setLoading] = useState(true)
    const [editingUserId, setEditingUserId] = useState<string | null>(null)
    const [editDisplayName, setEditDisplayName] = useState('')
    const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null)
    const [inviteModalOpen, setInviteModalOpen] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

    const [showAuditLogs, setShowAuditLogs] = useState(false)
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
    const [auditLoading, setAuditLoading] = useState(false)

    const supabase = createClient()
    const dialog = useDialog()
    const { t } = useLanguage()
    const { profile } = useAuthUser()
    const isOwner = profile?.role === 'owner'
    const isAdmin = profile?.role === 'admin'
    const canManageUsers = isOwner || isAdmin

    useEffect(() => {
        if (profile) {
            loadUsers()
        }
    }, [profile])

    const loadUsers = async () => {
        setLoading(true)

        if (canManageUsers) {
            const response = await fetch('/api/admin/users')
            if (response.ok) {
                const data = await response.json()
                setUsers(data.users || [])
            }
        } else if (profile?.id) {
            const { data } = await supabase
                .from('portal_users')
                .select('*')
                .eq('id', profile.id)
                .single()

            if (data) {
                setUsers([data])
            }
        }

        setLoading(false)
    }

    const loadAuditLogs = async () => {
        setAuditLoading(true)
        const response = await fetch('/api/admin/audit?limit=50&category=user_management')
        if (response.ok) {
            const data = await response.json()
            setAuditLogs(data.logs || [])
        }
        setAuditLoading(false)
    }

    const handleToggleAuditLogs = () => {
        if (!showAuditLogs && auditLogs.length === 0) {
            loadAuditLogs()
        }
        setShowAuditLogs(!showAuditLogs)
    }

    const handleStartEdit = (user: PortalUser) => {
        setEditingUserId(user.id)
        setEditDisplayName(user.display_name || user.full_name || '')
    }

    const handleCancelEdit = () => {
        setEditingUserId(null)
        setEditDisplayName('')
    }

    const handleSaveDisplayName = async (userId: string) => {
        if (!canManageUsers) return

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ display_name: editDisplayName })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update user')
            }

            setMessage({ type: 'success', text: 'Display name updated!' })
            await loadUsers()
            setEditingUserId(null)
            setEditDisplayName('')

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update user' })
        }

        setTimeout(() => setMessage(null), 3000)
    }

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        if (!canManageUsers) return

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to change role')
            }

            setMessage({ type: 'success', text: 'Role updated successfully!' })
            await loadUsers()
            setEditingRoleUserId(null)

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to change role' })
        }

        setTimeout(() => setMessage(null), 3000)
    }

    const handleToggleActive = async (userId: string, currentActive: boolean) => {
        if (!canManageUsers) return

        const confirmed = await dialog.confirm(
            `Are you sure you want to ${currentActive ? 'disable' : 'enable'} this user?`,
            `${currentActive ? 'Disable' : 'Enable'} User`
        )
        if (!confirmed) {
            return
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentActive })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update user')
            }

            setMessage({ type: 'success', text: `User ${!currentActive ? 'enabled' : 'disabled'}!` })
            await loadUsers()

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update user' })
        }

        setTimeout(() => setMessage(null), 3000)
    }

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!canManageUsers) return

        const confirmed = await dialog.confirm(
            `Are you sure you want to permanently delete "${userName}"? This action cannot be undone.`,
            'Delete User'
        )
        if (!confirmed) {
            return
        }

        setDeletingUserId(userId)

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to delete user')
            }

            setMessage({ type: 'success', text: 'User deleted successfully!' })
            await loadUsers()

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to delete user' })
        } finally {
            setDeletingUserId(null)
        }

        setTimeout(() => setMessage(null), 3000)
    }

    const getInitials = (user: PortalUser) => {
        const name = user.display_name || user.full_name || user.email
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const canEditUser = (targetUser: PortalUser): boolean => {
        if (!profile || !canManageUsers) return false
        if (targetUser.id === profile.id) return true

        const myLevel = USER_ROLE_LEVELS[profile.role as UserRole] || 0
        const targetLevel = USER_ROLE_LEVELS[targetUser.role as UserRole] || 0

        return isOwner || targetLevel < myLevel
    }

    const canDeleteUser = (targetUser: PortalUser): boolean => {
        if (!profile || !canManageUsers) return false
        if (targetUser.id === profile.id) return false
        if (targetUser.role === 'owner') return false

        const myLevel = USER_ROLE_LEVELS[profile.role as UserRole] || 0
        const targetLevel = USER_ROLE_LEVELS[targetUser.role as UserRole] || 0

        return isOwner || targetLevel < myLevel
    }

    const getAvailableRoles = (targetUser: PortalUser): UserRole[] => {
        if (!profile) return []
        const myLevel = USER_ROLE_LEVELS[profile.role as UserRole] || 0
        if (isOwner) return ROLES_ORDER
        return ROLES_ORDER.filter(r => USER_ROLE_LEVELS[r] < myLevel)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('settings.team.loading_team')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-4xl mx-auto px-4 sm:px-0">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <PageHeader
                    label={t('common.settings').toUpperCase()}
                    title={t('settings.team.title')}
                    subtitle={t('settings.team.subtitle')}
                    className="mb-0 pb-0 border-0"
                />
                {canManageUsers && (
                    <GlassButton
                        variant="accent"
                        size="sm"
                        onClick={() => setInviteModalOpen(true)}
                        leftIcon={<Plus className="w-4 h-4" />}
                    >
                        {t('settings.team.invite_member')}
                    </GlassButton>
                )}
            </div>

            {/* Message Toast */}
            {message && (
                <div className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg animate-fade-in ${message.type === 'success'
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200'
                    : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200'
                    }`}>
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
                        }`}>
                        {message.type === 'success' ? (
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                    </div>
                    <span className="font-medium text-sm sm:text-base">{message.text}</span>
                </div>
            )}

            {/* Users List */}
            <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-base sm:text-lg font-semibold text-primary">
                        {users.length} {users.length === 1 ? 'Member' : 'Members'}
                    </h2>
                </div>

                {users.length === 0 ? (
                    <div className="glass-card p-8 sm:p-12 rounded-xl sm:rounded-2xl text-center">
                        <Users className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No team members found</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {users.map((user) => {
                            const roleConfig = ROLE_CONFIG[user.role as UserRole] || ROLE_CONFIG.viewer
                            const RoleIcon = roleConfig.icon
                            const canEdit = canEditUser(user)
                            const canDelete = canDeleteUser(user)
                            const availableRoles = getAvailableRoles(user)
                            const isDeleting = deletingUserId === user.id

                            return (
                                <div
                                    key={user.id}
                                    className={`group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-sand-200 shadow-sm hover:shadow-md transition-all ${!user.is_active ? 'opacity-60' : ''
                                        } ${isDeleting ? 'pointer-events-none' : ''}`}
                                >
                                    {/* Role accent bar */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${roleConfig.gradient}`} />

                                    <div className="p-4 sm:p-5 pl-4 sm:pl-6">
                                        {/* Mobile layout */}
                                        <div className="flex items-start gap-3 sm:hidden">
                                            {/* Avatar */}
                                            <div className={`relative w-10 h-10 rounded-lg bg-gradient-to-br ${roleConfig.gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0`}>
                                                {getInitials(user)}
                                                {user.role === 'owner' && (
                                                    <Crown className="absolute -top-1 -right-1 w-3 h-3 text-amber-400" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-primary truncate text-sm">
                                                    {user.display_name || user.full_name || 'Unnamed'}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${roleConfig.bgColor} ${roleConfig.color}`}>
                                                        <RoleIcon className="w-3 h-3" />
                                                        {user.role}
                                                    </span>
                                                    {!user.is_active && (
                                                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-[10px] font-bold uppercase">
                                                            Disabled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Mobile actions */}
                                            {canEdit && (
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        onClick={() => handleStartEdit(user)}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-sand-100 rounded-lg"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id, user.display_name || user.email)}
                                                            className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                            disabled={isDeleting}
                                                        >
                                                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Desktop layout */}
                                        <div className="hidden sm:flex items-center gap-4">
                                            {/* Avatar */}
                                            <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${roleConfig.gradient} flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0`}>
                                                {getInitials(user)}
                                                {user.role === 'owner' && (
                                                    <Crown className="absolute -top-1 -right-1 w-4 h-4 text-amber-400" />
                                                )}
                                            </div>

                                            {/* User Info */}
                                            <div className="flex-1 min-w-0">
                                                {editingUserId === user.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editDisplayName}
                                                            onChange={(e) => setEditDisplayName(e.target.value)}
                                                            className="flex-1 px-3 py-2 rounded-lg border-2 border-accent bg-white text-sm font-semibold focus:ring-2 focus:ring-accent/20 outline-none"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleSaveDisplayName(user.id)}
                                                            className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-lg transition-colors"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="p-2 hover:bg-sand-100 rounded-lg transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="font-semibold text-primary truncate">
                                                        {user.display_name || user.full_name || 'Unnamed User'}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                                    <span className="text-sm text-muted-foreground truncate">{user.email}</span>
                                                    {!user.is_active && (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold uppercase flex-shrink-0">
                                                            Disabled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Role & Actions */}
                                            <div className="flex items-center gap-2">
                                                {/* Role Badge/Selector */}
                                                {editingRoleUserId === user.id ? (
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                                        className="px-3 py-2 rounded-lg border-2 border-accent bg-white text-sm font-semibold focus:ring-2 focus:ring-accent/20 outline-none"
                                                        autoFocus
                                                        onBlur={() => setEditingRoleUserId(null)}
                                                    >
                                                        {availableRoles.map(r => (
                                                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <button
                                                        onClick={() => canEdit && user.id !== profile?.id && user.role !== 'owner' && setEditingRoleUserId(user.id)}
                                                        disabled={!canEdit || user.id === profile?.id || user.role === 'owner'}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${roleConfig.bgColor} ${roleConfig.color} ${canEdit && user.id !== profile?.id && user.role !== 'owner'
                                                            ? 'cursor-pointer hover:scale-105 hover:shadow-md'
                                                            : 'cursor-default'
                                                            }`}
                                                        title={canEdit && user.id !== profile?.id && user.role !== 'owner' ? 'Click to change role' : ''}
                                                    >
                                                        <RoleIcon className="w-3.5 h-3.5" />
                                                        {user.role}
                                                    </button>
                                                )}

                                                {/* Action Buttons */}
                                                {canEdit && editingUserId !== user.id && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleStartEdit(user)}
                                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-sand-100 rounded-lg transition-all"
                                                            title="Edit display name"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        {user.role !== 'owner' && user.id !== profile?.id && (
                                                            <button
                                                                onClick={() => handleToggleActive(user.id, user.is_active)}
                                                                className={`p-2 rounded-lg transition-all ${user.is_active
                                                                    ? 'text-muted-foreground hover:text-red-600 hover:bg-red-50'
                                                                    : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50'
                                                                    }`}
                                                                title={user.is_active ? 'Disable user' : 'Enable user'}
                                                            >
                                                                <Power className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDeleteUser(user.id, user.display_name || user.email)}
                                                                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Delete user"
                                                                disabled={isDeleting}
                                                            >
                                                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Roles Legend */}
            <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-100 flex items-center justify-center">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-primary text-sm sm:text-base">Role Permissions</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {ROLES_ORDER.map(role => {
                        const config = ROLE_CONFIG[role]
                        const Icon = config.icon
                        return (
                            <div key={role} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/60">
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${config.color}`} />
                                </div>
                                <div className="min-w-0">
                                    <p className={`font-semibold capitalize text-xs sm:text-sm ${config.color}`}>{role}</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{USER_ROLE_DESCRIPTIONS[role]}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Activity Log */}
            {canManageUsers && (
                <div className="rounded-xl sm:rounded-2xl bg-white border border-sand-200 overflow-hidden shadow-sm">
                    <button
                        onClick={handleToggleAuditLogs}
                        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-sand-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-primary text-sm sm:text-base">Activity Log</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">View team management history</p>
                            </div>
                        </div>
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sand-100 flex items-center justify-center transition-transform ${showAuditLogs ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </button>

                    {showAuditLogs && (
                        <div className="border-t border-sand-200">
                            {auditLoading ? (
                                <div className="p-6 sm:p-8 text-center">
                                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-accent mx-auto mb-2" />
                                    <p className="text-xs sm:text-sm text-muted-foreground">Loading activity...</p>
                                </div>
                            ) : auditLogs.length === 0 ? (
                                <div className="p-6 sm:p-8 text-center">
                                    <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/50 mx-auto mb-2" />
                                    <p className="text-xs sm:text-sm text-muted-foreground">No activity recorded yet</p>
                                </div>
                            ) : (
                                <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-sand-100">
                                    {auditLogs.map((log) => (
                                        <div key={log.id} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-sand-50/50 transition-colors">
                                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-sand-200 to-sand-300 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary flex-shrink-0">
                                                {log.user_email?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-xs sm:text-sm text-primary truncate">{log.user_email}</span>
                                                    <span className="text-[10px] sm:text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-medium whitespace-nowrap">
                                                        {getActionLabel(log.action as any)}
                                                    </span>
                                                </div>
                                                {log.entity_name && (
                                                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">→ {log.entity_name}</p>
                                                )}
                                            </div>
                                            <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap text-right flex-shrink-0">
                                                <div>{new Date(log.created_at).toLocaleDateString()}</div>
                                                <div className="text-muted-foreground/60">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Invite Modal */}
            <InviteUserModal
                isOpen={inviteModalOpen}
                onClose={() => setInviteModalOpen(false)}
                onSuccess={() => {
                    setMessage({ type: 'success', text: 'Invitation sent successfully!' })
                    loadUsers()
                    setTimeout(() => setMessage(null), 3000)
                }}
            />
        </div>
    )
}
