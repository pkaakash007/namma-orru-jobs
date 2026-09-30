import React from 'react'
import type { AdminStats } from '../../../types'
import { Card } from '../../ui/Card'
import { Users, ShieldCheck, Briefcase, UserCheck } from 'lucide-react'

interface AdminStatsGridProps {
  stats: AdminStats
}

export const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card className="p-4 shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold">Total Users</span>
          <Users className="h-4 w-4" />
        </div>
        <p className="mt-1 text-2xl font-black text-[#0B2545]">{stats.total_users}</p>
        <span className="text-[11px] text-slate-400">Registered members</span>
      </Card>

      <Card className="p-4 shadow-sm border-l-4 border-l-[#0B2545]">
        <div className="flex items-center justify-between text-[#0B2545]">
          <span className="text-xs font-bold">Admins</span>
          <ShieldCheck className="h-4 w-4 text-[#0B2545]" />
        </div>
        <p className="mt-1 text-2xl font-black text-[#0B2545]">{stats.admins}</p>
        <span className="text-[11px] text-slate-500">Manual database role</span>
      </Card>

      <Card className="p-4 shadow-sm border-l-4 border-l-[#F97316]">
        <div className="flex items-center justify-between text-[#F97316]">
          <span className="text-xs font-bold">HR / Managers</span>
          <Briefcase className="h-4 w-4 text-[#F97316]" />
        </div>
        <p className="mt-1 text-2xl font-black text-[#F97316]">{stats.managers_hr}</p>
        <span className="text-[11px] text-slate-500">Assigned by Admin</span>
      </Card>

      <Card className="p-4 shadow-sm border-l-4 border-l-slate-400">
        <div className="flex items-center justify-between text-slate-700">
          <span className="text-xs font-bold">Candidates</span>
          <UserCheck className="h-4 w-4 text-slate-500" />
        </div>
        <p className="mt-1 text-2xl font-black text-slate-800">{stats.employees}</p>
        <span className="text-[11px] text-slate-500">Default role</span>
      </Card>
    </div>
  )
}
