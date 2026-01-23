'use client'

import { UserPlus } from 'lucide-react'
import { CiImport, CiExport } from 'react-icons/ci'
import { BiSelectMultiple } from 'react-icons/bi'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'

interface CustomersListFABProps {
    onSelectClick: () => void
    onImportClick: () => void
    onExportClick: () => void
}

export function CustomersListFAB({ onSelectClick, onImportClick, onExportClick }: CustomersListFABProps) {
    return (
        <FloatingActionButton
            actions={[
                { label: 'Add Customer', href: '/customers/new', icon: UserPlus, variant: 'theme' },
                { label: 'Select', onClick: onSelectClick, icon: BiSelectMultiple, variant: 'white' },
                { label: 'Import', onClick: onImportClick, icon: CiImport, variant: 'white' },
                { label: 'Export', onClick: onExportClick, icon: CiExport, variant: 'white' }
            ]}
        />
    )
}
