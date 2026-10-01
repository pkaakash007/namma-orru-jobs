import React from 'react'
import type { AdminStats } from '../../../types'
import { Card } from '../../ui/Card'
import { Briefcase, Users, Clock, ArrowRight } from 'lucide-react'

interface AdminStatsGridProps {
  stats: AdminStats
  onSelectHrTab?: () => void
}

export const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({ stats, onSelectHrTab }) => {
  const pendingHr = stats?.pending_hr_verifications ?? 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {/* 1. HR Count */}
      <Card className="p-4 sm:p-5 rounded-2xl border-slate-200/90 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">HR / Employers</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
            <Briefcase className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 text-3xl font-black text-[#EA580C] tracking-tight">
          {stats?.managers_hr ?? 0}
        </p>
        <span className="text-xs text-slate-500 font-medium">Verified recruiters</span>
      </Card>

      {/* 2. Employees / Candidates Count */}
      <Card className="p-4 sm:p-5 rounded-2xl border-slate-200/90 bg-white shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Employees / Candidates</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#0B2545]">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 text-3xl font-black text-[#0B2545] tracking-tight">
          {stats?.employees ?? 0}
        </p>
        <span className="text-xs text-slate-500 font-medium">Registered job seekers</span>
      </Card>

      {/* 3. Pending Reviews Queue */}
      <Card
        onClick={onSelectHrTab}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
          pendingHr > 0
            ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/70 shadow-xs ring-1 ring-amber-300/60'
            : 'border-slate-200/90 bg-white hover:bg-slate-50 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Review</span>
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${pendingHr > 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
            <Clock className={`h-4 w-4 ${pendingHr > 0 ? 'animate-pulse' : ''}`} />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <p className="text-3xl font-black text-amber-600 tracking-tight">
            {pendingHr}
          </p>
          {pendingHr > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
              Action Required
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-amber-800/80 font-medium">Awaiting HR audit</span>
          {onSelectHrTab && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:underline">
              Review
              <ArrowRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}
