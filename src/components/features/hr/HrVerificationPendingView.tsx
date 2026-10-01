import React, { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { Badge } from '../../ui/Badge'
import {
  ShieldAlert,
  Clock,
  Building2,
  Briefcase,
  Mail,
  Phone,
  CheckCircle2,
  RefreshCw,
  LogOut,
  AlertCircle,
  FileText,
  UserCheck,
} from 'lucide-react'

interface HrVerificationPendingViewProps {
  onBackToFeed?: () => void
  compact?: boolean
}

export const HrVerificationPendingView: React.FC<HrVerificationPendingViewProps> = ({
  onBackToFeed,
  compact = false,
}) => {
  const { user, refreshUser, logout } = useAuth()
  const { showToast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const isRejected = (user?.status || '').toUpperCase() === 'REJECTED'

  const handleRefreshStatus = async () => {
    setIsRefreshing(true)
    try {
      await refreshUser()
      const updatedStatus = (user?.status || '').toUpperCase()
      if (updatedStatus === 'ACTIVE') {
        showToast('Congratulations! Your recruiter account has been verified and activated.', 'success')
      } else if (updatedStatus === 'REJECTED') {
        showToast('Your account verification was not approved. Please review the reason below.', 'error')
      } else {
        showToast('Account is still under admin verification. Please check back shortly.', 'info')
      }
    } catch {
      showToast('Could not refresh status. Please check your network connection.', 'error')
    } finally {
      setIsRefreshing(false)
    }
  }

  if (compact) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/50 p-6 text-slate-800 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            {isRejected ? <ShieldAlert className="h-6 w-6 text-rose-600" /> : <Clock className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {isRejected ? 'Account Verification Not Approved' : 'Identity Verification Required'}
              </h3>
              <Badge variant={isRejected ? 'danger' : 'warning'}>
                {isRejected ? 'REJECTED' : 'PENDING VERIFICATION'}
              </Badge>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {isRejected
                ? user?.rejection_reason
                  ? `Your HR verification was not approved: ${user.rejection_reason}`
                  : 'Your HR verification was not approved. Contact our administration team for further details.'
                : 'Your HR account is currently pending verification. Our admin team will contact you shortly to verify your identity. You will receive access to recruiter features once your account has been approved.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Checking...' : 'Check Status'}
              </button>
              {onBackToFeed && (
                <button
                  type="button"
                  onClick={onBackToFeed}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Return to Home
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-100/60">
        {/* Header Banner */}
        <div
          className={`p-6 sm:p-8 text-white ${
            isRejected
              ? 'bg-gradient-to-r from-rose-900 via-rose-800 to-rose-700'
              : 'bg-gradient-to-r from-slate-900 via-[#0B2545] to-slate-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  isRejected ? 'bg-rose-500/20 text-rose-200' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {isRejected ? <ShieldAlert className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
              </div>
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
                  HR Recruiter Compliance
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {isRejected ? 'Account Verification Not Approved' : 'Your account is under verification'}
                </h1>
              </div>
            </div>
            <div className="self-start sm:self-auto">
              <Badge variant={isRejected ? 'danger' : 'warning'} className="px-3 py-1 text-xs">
                {isRejected ? 'STATUS: REJECTED' : 'STATUS: PENDING VERIFICATION'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Core Message Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Exact Required Compliance Notice */}
          <div
            className={`rounded-2xl border p-5 ${
              isRejected
                ? 'border-rose-200 bg-rose-50/70 text-rose-900'
                : 'border-amber-200/80 bg-amber-50/60 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  isRejected ? 'text-rose-600' : 'text-amber-600'
                }`}
              />
              <div className="text-sm leading-relaxed space-y-2">
                <p className="font-semibold text-slate-900">
                  {isRejected ? 'Verification Criteria Not Satisfied' : 'Identity Verification Required'}
                </p>
                <p className="text-slate-700">
                  {isRejected
                    ? `Reason: ${
                        user?.rejection_reason ||
                        'Your HR identity and corporate credentials could not be verified by the admin team.'
                      }`
                    : 'Our admin team will contact you shortly to verify your identity. Once verification is completed, your recruiter account will be activated and you will be able to access job posting and employee management features.'}
                </p>
                {!isRejected && (
                  <p className="text-xs text-slate-500">
                    To maintain platform trust across Tamil Nadu employers and candidates, all recruiter accounts
                    undergo manual review prior to granting candidate contact and job posting capabilities.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Verification Lifecycle Progression */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Account Verification Lifecycle
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-950">1. HR Signup</p>
                  <p className="text-[11px] text-emerald-800 truncate">Application Registered</p>
                </div>
              </div>

              <div
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  isRejected
                    ? 'border-rose-200 bg-rose-50 text-rose-950'
                    : 'border-amber-300 bg-amber-50 text-amber-950 ring-2 ring-amber-300/40'
                }`}
              >
                {isRejected ? (
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold">2. Admin Review</p>
                  <p className="text-[11px] opacity-80 truncate">
                    {isRejected ? 'Rejected by Admin' : 'In Review by Team'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 p-3 opacity-60">
                <Briefcase className="h-5 w-5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700">3. Active Recruiter</p>
                  <p className="text-[11px] text-slate-500 truncate">Post & Manage Jobs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submitted Recruiter Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5">
              Submitted Recruiter Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2.5 text-slate-600">
                <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-500">Contact:</span>
                <span className="font-semibold text-slate-900 truncate">
                  {user?.full_name || 'Not provided'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-500">Work Email:</span>
                <span className="font-semibold text-slate-900 truncate">{user?.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-500">Organization:</span>
                <span className="font-semibold text-slate-900 truncate">
                  {user?.company || 'Company details submitted'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600">
                <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-500">Position:</span>
                <span className="font-semibold text-slate-900 truncate">
                  {user?.position || 'Talent Acquisition / HR'}
                </span>
              </div>
              {user?.phone && (
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-500">Phone:</span>
                  <span className="font-semibold text-slate-900">{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-slate-600">
                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-500">Account Role:</span>
                <span className="font-semibold text-slate-900">HR Recruiter (manager)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-orange-700 active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Checking Status...' : 'Check Verification Status'}
              </button>
              {onBackToFeed && (
                <button
                  type="button"
                  onClick={onBackToFeed}
                  className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Return to Home
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out / Switch Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
