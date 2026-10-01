import React, { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { Clock, AlertCircle, RefreshCw } from 'lucide-react'

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
        showToast('Your recruiter account has been verified and activated.', 'success')
      } else if (updatedStatus === 'REJECTED') {
        showToast('Your account verification was not approved.', 'error')
      } else {
        showToast('Account is still under review. Please check back shortly.', 'info')
      }
    } catch {
      showToast('Could not refresh status. Please check your network connection.', 'error')
    } finally {
      setIsRefreshing(false)
    }
  }

  // ── Compact In-Feed Strip ──
  if (compact) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isRejected
                ? 'bg-rose-50 border border-rose-100 text-rose-600'
                : 'bg-amber-50 border border-amber-100 text-amber-600'
            }`}
          >
            {isRejected ? (
              <AlertCircle className="w-4 h-4 stroke-[1.75]" />
            ) : (
              <Clock className="w-4 h-4 stroke-[1.75]" />
            )}
          </div>
          <p className="text-slate-600 leading-snug">
            <strong className="text-slate-900 font-semibold">
              {isRejected ? 'Verification Not Approved' : 'Account Under Review'}:
            </strong>{' '}
            {isRejected
              ? user?.rejection_reason || 'Contact administration for details.'
              : 'Job posting and candidate search unlock once verified.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefreshStatus}
          disabled={isRefreshing}
          className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
        >
          {isRefreshing ? 'Checking...' : 'Check Status'}
        </button>
      </div>
    )
  }

  // ── Clean iOS-Style Centered Card ──
  return (
    <div className="flex items-center justify-center min-h-[55vh] px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 text-center shadow-lg shadow-slate-100/60">
        {/* iOS Squircle Icon */}
        <div
          className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
            isRejected
              ? 'bg-rose-50 border border-rose-100 text-rose-600'
              : 'bg-amber-50 border border-amber-100 text-amber-600'
          }`}
        >
          {isRejected ? (
            <AlertCircle className="w-7 h-7 stroke-[1.75]" />
          ) : (
            <Clock className="w-7 h-7 stroke-[1.75]" />
          )}
        </div>

        {/* Clean Human Title */}
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          {isRejected ? 'Verification Not Approved' : 'Verification in Progress'}
        </h2>

        {/* Direct, Concise Message (No Unwanted Boilerplate) */}
        <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
          {isRejected
            ? user?.rejection_reason || 'Your recruiter account credentials could not be verified.'
            : 'Your recruiter account is currently being reviewed. You will be able to post jobs and contact candidates as soon as your account is approved.'}
        </p>

        {/* iOS Button Stack */}
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Checking...' : 'Check Status'}</span>
          </button>

          {onBackToFeed && (
            <button
              type="button"
              onClick={onBackToFeed}
              className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs sm:text-sm font-medium transition cursor-pointer"
            >
              Return to Jobs
            </button>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={logout}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
