import React from 'react'
import type { UserRole } from '../../types'
import { ROLE_CONFIG } from '../../constants'
import { ShieldCheck, Briefcase, UserCheck } from 'lucide-react'

export interface BadgeProps {
  children?: React.ReactNode
  variant?: 'role' | 'neutral' | 'success' | 'warning'
  role?: UserRole
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  role,
  className = '',
}) => {
  if (variant === 'role' && role) {
    const config = ROLE_CONFIG[role]
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass} ${className}`}
      >
        {role === 'admin' && <ShieldCheck className="h-3.5 w-3.5 text-white" />}
        {role === 'manager' && <Briefcase className="h-3.5 w-3.5 text-orange-600" />}
        {role === 'employee' && <UserCheck className="h-3.5 w-3.5 text-slate-600" />}
        <span>{config.label}</span>
      </span>
    )
  }

  const variantMap = {
    neutral: 'bg-[#EDF3F8] text-[#0B2545] border border-[#D0E2EC]',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-orange-50 text-orange-800 border border-orange-200',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        variantMap[variant as 'neutral' | 'success' | 'warning']
      } ${className}`}
    >
      {children}
    </span>
  )
}
