import React, { useState } from 'react'
import type { AdminStats, User, Language } from '../../../types'
import { Card } from '../../ui/Card'
import { Badge } from '../../ui/Badge'
import { AdminStatsGrid } from './AdminStatsGrid'
import { HrVerificationTable } from './HrVerificationTable'
import { UserDirectoryTable } from './UserDirectoryTable'
import { AdminModerationTable } from './AdminModerationTable'
import { RoleGuideCard } from './RoleGuideCard'
import {
  ShieldCheck,
  Users,
  Briefcase,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'

export type AdminSectionTab = 'hr-verifications' | 'users' | 'moderation' | 'governance'

interface AdminDashboardViewProps {
  currentUser: User | null
  stats: AdminStats
  usersList: User[]
  onPromoteUser: (userId: string) => void
  onDemoteUser: (userId: string) => void
  onRefreshAll: () => Promise<void> | void
  lang: Language
  initialSection?: AdminSectionTab
  onSectionChange?: (sec: AdminSectionTab) => void
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  stats,
  usersList,
  onPromoteUser,
  onDemoteUser,
  onRefreshAll,
  lang,
  initialSection = 'hr-verifications',
  onSectionChange,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSectionTab>(initialSection)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleSectionSwitch = (sec: AdminSectionTab) => {
    setActiveSection(sec)
    onSectionChange?.(sec)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefreshAll()
    } finally {
      setTimeout(() => setIsRefreshing(false), 400)
    }
  }

  const pendingCount = stats?.pending_hr_verifications || 0
  const totalUsers = stats?.total_users || usersList.length || 0

  return (
    <div className="w-full space-y-6">
      {/* ── Top Executive Command Banner (Apple iOS Style) ── */}
      <Card className="p-6 sm:p-7 border-slate-200/90 bg-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Production D1 Operational</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">•</span>
              <span className="text-xs text-slate-500 font-medium">Platform Command Center</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight">
              Administrator Dashboard
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-600">
              <span>Logged in as</span>
              <strong className="text-slate-900 font-bold">{currentUser?.full_name || 'Admin'}</strong>
              <span className="text-slate-400">({currentUser?.email || 'admin@nammaoorujobs.com'})</span>
              <Badge variant="role" role="admin" />
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => handleSectionSwitch('hr-verifications')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition cursor-pointer active:scale-98"
              >
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                <span>{pendingCount} Recruiter Awaiting Review</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 active:scale-95 disabled:opacity-50 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#0B2545] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>
      </Card>

      {/* ── Key Metrics Overview ── */}
      <AdminStatsGrid
        stats={stats}
        onSelectHrTab={() => handleSectionSwitch('hr-verifications')}
      />

      {/* ── Clean Apple iOS Segmented Navigation Bar ── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* HR Recruiter Verifications Tab */}
          <button
            type="button"
            onClick={() => handleSectionSwitch('hr-verifications')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'hr-verifications'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>HR Recruiter Verifications</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                {pendingCount}
              </span>
            )}
          </button>

          {/* User Directory & Roles Tab */}
          <button
            type="button"
            onClick={() => handleSectionSwitch('users')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'users'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>User Directory & Roles</span>
            {totalUsers > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  activeSection === 'users'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalUsers}
              </span>
            )}
          </button>

          {/* Content Moderation Tab */}
          <button
            type="button"
            onClick={() => handleSectionSwitch('moderation')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'moderation'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Content Moderation</span>
          </button>

          {/* Role Architecture Guide Tab */}
          <button
            type="button"
            onClick={() => handleSectionSwitch('governance')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'governance'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Role Governance Guide</span>
          </button>
        </div>
      </div>

      {/* ── Active Full-Width Section Content ── */}
      <div className="w-full">
        {activeSection === 'hr-verifications' && (
          <HrVerificationTable onRefreshStats={handleRefresh} />
        )}

        {activeSection === 'users' && (
          <UserDirectoryTable
            users={usersList}
            onPromote={onPromoteUser}
            onDemote={onDemoteUser}
            onRefresh={handleRefresh}
          />
        )}

        {activeSection === 'moderation' && (
          <AdminModerationTable lang={lang} />
        )}

        {activeSection === 'governance' && (
          <div className="space-y-4">
            <RoleGuideCard />
          </div>
        )}
      </div>
    </div>
  )
}
