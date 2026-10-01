import React from 'react'
import type { AdminStats } from '../../../types'
import { Card } from '../../ui/Card'
import { Users, ShieldCheck, Briefcase, UserCheck, Clock } from 'lucide-react'

interface AdminStatsGridProps {
  stats: AdminStats
  onSelectHrTab?: () => void
}

export const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({ stats, onSelectHrTab }) => {
  const pendingHr = stats.pending_hr_verifications ?? 0

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
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
        <span className="text-[11px] text-slate-500">Platform security</span>
      </Card>

      <Card className="p-4 shadow-sm border-l-4 border-l-[#F97316]">
        <div className="flex items-center justify-between text-[#F97316]">
          <span className="text-xs font-bold">HR / Managers</span>
          <Briefcase className="h-4 w-4 text-[#F97316]" />
        </div>
        <p className="mt-1 text-2xl font-black text-[#F97316]">{stats.managers_hr}</p>
        <span className="text-[11px] text-slate-500">Verified Recruiters</span>
      </Card>

      <Card
        onClick={onSelectHrTab}
        className={`p-4 shadow-sm border-l-4 border-l-amber-500 transition-all ${
          onSelectHrTab ? 'cursor-pointer hover:bg-amber-50/40' : ''
        } ${pendingHr > 0 ? 'ring-1 ring-amber-400/60 bg-amber-50/20' : ''}`}
      >
        <div className="flex items-center justify-between text-amber-700">
          <span className="text-xs font-bold">Pending HR</span>
          <Clock className={`h-4 w-4 ${pendingHr > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-black text-amber-600">{pendingHr}</p>
          {pendingHr > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
              Action
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500">Awaiting verification</span>
      </Card>

      <Card className="p-4 shadow-sm border-l-4 border-l-slate-400">
        <div className="flex items-center justify-between text-slate-700">
          <span className="text-xs font-bold">Candidates</span>
          <UserCheck className="h-4 w-4 text-slate-500" />
        </div>
        <p className="mt-1 text-2xl font-black text-slate-800">{stats.employees}</p>
        <span className="text-[11px] text-slate-500">Active job seekers</span>
      </Card>
    </div>
  )
}
