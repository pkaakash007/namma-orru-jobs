import React, { useState, useEffect, useCallback } from 'react'
import type { HrVerificationAccount, HrVerificationsResponse } from '../../../types'
import { adminService, hrService } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { Card } from '../../ui/Card'
import {
  Briefcase,
  Eye,
  RefreshCw,
  UserCheck,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface HrVerificationTableProps {
  onRefreshStats?: () => void
}

type FilterStatus = 'pending' | 'active' | 'rejected' | 'all'

export const HrVerificationTable: React.FC<HrVerificationTableProps> = ({ onRefreshStats }) => {
  const { showToast } = useToast()

  const [verifications, setVerifications] = useState<HrVerificationAccount[]>([])
  const [counts, setCounts] = useState({ pending: 0, active: 0, rejected: 0, total: 0 })
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Modals state
  const [inspectUser, setInspectUser] = useState<HrVerificationAccount | null>(null)
  const [approvingUser, setApprovingUser] = useState<HrVerificationAccount | null>(null)
  const [rejectingUser, setRejectingUser] = useState<HrVerificationAccount | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Profile edit review
  const [profileEditUser, setProfileEditUser] = useState<HrVerificationAccount | null>(null)
  const [profileRejectReason, setProfileRejectReason] = useState('')
  const [isProfileProcessing, setIsProfileProcessing] = useState(false)

  const fetchVerifications = useCallback(
    async (status: FilterStatus = activeFilter) => {
      setIsLoading(true)
      try {
        const res: HrVerificationsResponse = await adminService.getHrVerifications(status)
        setVerifications(res.verifications || [])
        if (res.counts) {
          setCounts(res.counts)
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load HR verifications', 'error')
      } finally {
        setIsLoading(false)
      }
    },
    [activeFilter, showToast]
  )

  useEffect(() => {
    fetchVerifications(activeFilter)
  }, [activeFilter, fetchVerifications])

  // Handle Approve
  const handleApprove = async () => {
    if (!approvingUser) return
    setIsProcessing(true)
    try {
      const res = await adminService.approveHrVerification(approvingUser.id)
      showToast(res.message || `Approved ${approvingUser.full_name}`, 'success')
      setApprovingUser(null)
      await fetchVerifications(activeFilter)
      if (onRefreshStats) onRefreshStats()
    } catch (err: any) {
      showToast(err.message || 'Failed to approve account', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Reject
  const handleReject = async () => {
    if (!rejectingUser) return
    if (!rejectionReason.trim()) {
      showToast('Please provide a reason for rejecting the verification', 'error')
      return
    }
    setIsProcessing(true)
    try {
      const res = await adminService.rejectHrVerification(rejectingUser.id, rejectionReason.trim())
      showToast(res.message || `Verification rejected for ${rejectingUser.full_name}`, 'info')
      setRejectingUser(null)
      setRejectionReason('')
      await fetchVerifications(activeFilter)
      if (onRefreshStats) onRefreshStats()
    } catch (err: any) {
      showToast(err.message || 'Failed to reject account', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApproveProfileEdit = async (userId: string, userName: string) => {
    setIsProfileProcessing(true)
    try {
      const res = await hrService.approveProfileRequest(userId)
      showToast(res.message || `Profile changes approved for ${userName}`, 'success')
      setProfileEditUser(null)
      await fetchVerifications(activeFilter)
      if (onRefreshStats) onRefreshStats()
    } catch (err: any) {
      showToast(err.message || 'Failed to approve profile changes', 'error')
    } finally {
      setIsProfileProcessing(false)
    }
  }

  const handleRejectProfileEdit = async () => {
    if (!profileEditUser) return
    setIsProfileProcessing(true)
    try {
      const res = await hrService.rejectProfileRequest(
        profileEditUser.id,
        profileRejectReason || 'Profile update rejected by admin'
      )
      showToast(res.message || `Profile update rejected for ${profileEditUser.full_name}`, 'info')
      setProfileEditUser(null)
      setProfileRejectReason('')
      await fetchVerifications(activeFilter)
    } catch (err: any) {
      showToast(err.message || 'Failed to reject profile changes', 'error')
    } finally {
      setIsProfileProcessing(false)
    }
  }

  const filteredList = verifications.filter((v) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      v.full_name.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      (v.company && v.company.toLowerCase().includes(q)) ||
      (v.position && v.position.toLowerCase().includes(q)) ||
      (v.phone && v.phone.includes(q))
    )
  })

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase()
    if (s === 'ACTIVE' || s === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      )
    }
    if (s === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Rejected
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Pending Review
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Recruiter Accounts Table */}
      <Card className="overflow-hidden border-slate-200/90 shadow-xs">
        <div className="border-b border-slate-100 p-4 sm:p-5 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">Recruiter Verifications</h3>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search recruiters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0B2545] focus:outline-none transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchVerifications(activeFilter)}
                disabled={isLoading}
                title="Refresh list"
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Clean Segmented Filter Bar */}
          <div className="pt-1">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('pending')
                  fetchVerifications('pending')
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'pending'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Pending</span>
                {counts.pending > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {counts.pending}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveFilter('active')
                  fetchVerifications('active')
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'active'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Active</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-600">
                  {counts.active}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveFilter('rejected')
                  fetchVerifications('rejected')
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'rejected'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Rejected</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-600">
                  {counts.rejected}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveFilter('all')
                  fetchVerifications('all')
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>All</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-600">
                  {counts.total}
                </span>
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="mx-auto h-7 w-7 text-slate-400 animate-spin" />
            <p className="mt-2 text-xs font-semibold text-slate-500">Loading recruiter verifications...</p>
          </div>
        ) : verifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <UserCheck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No recruiter accounts found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              No recruiter accounts registered yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Recruiter</th>
                  <th className="py-3 px-4 font-semibold">Company & Role</th>
                  <th className="py-3 px-4 font-semibold">Contact</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Registered</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((recruiter) => {
                  const s = (recruiter.status || '').toUpperCase()
                  const isPending = s === 'PENDING_VERIFICATION' || s === 'PENDING'
                  const isUserRejected = s === 'REJECTED'

                  return (
                    <tr key={recruiter.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Recruiter Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-xs uppercase">
                            {recruiter.full_name ? recruiter.full_name.charAt(0) : 'R'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {recruiter.full_name || 'Unnamed Recruiter'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{recruiter.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Company & Role */}
                      <td className="py-3.5 px-4">
                        {recruiter.company || recruiter.position ? (
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                              {recruiter.company || '—'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {recruiter.position || 'Recruiter'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {recruiter.phone ? (
                          <span className="text-[11px] text-slate-700 font-medium">{recruiter.phone}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {getStatusBadge(recruiter.status)}
                          {isUserRejected && recruiter.rejection_reason && (
                            <p className="text-[10px] text-rose-600 truncate max-w-[160px]" title={recruiter.rejection_reason}>
                              {recruiter.rejection_reason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                        {recruiter.created_at
                          ? new Date(recruiter.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => setApprovingUser(recruiter)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer active:scale-95 shadow-2xs"
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingUser(recruiter)
                                  setRejectionReason('')
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 font-medium text-xs transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isUserRejected && (
                            <button
                              type="button"
                              onClick={() => setApprovingUser(recruiter)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
                            >
                              Approve
                            </button>
                          )}

                          {s === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingUser(recruiter)
                                setRejectionReason('')
                              }}
                              className="px-2 py-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}

                          {recruiter.pending_profile && (
                            <button
                              type="button"
                              onClick={() => setProfileEditUser(recruiter)}
                              className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-semibold transition cursor-pointer"
                            >
                              Profile Edit
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setInspectUser(recruiter)}
                            title="View Details"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inspect Recruiter Modal (Apple iOS Sheet/Card Theme) */}
      {/* Inspect Recruiter Modal (Apple iOS Sheet/Card Theme) */}
      {inspectUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-md select-none animate-in fade-in"
          onClick={() => setInspectUser(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-[320px] sm:w-[360px] max-w-full rounded-[20px] bg-[#F2F2F7]/92 backdrop-blur-2xl border border-white/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.30)] text-center overflow-hidden animate-in zoom-in-95 duration-200 ease-out select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top iOS Symbol Badge */}
            <div className="pt-5 pb-2 px-5 flex justify-center">
              <div className="h-10 w-10 rounded-full bg-blue-500/12 text-[#007AFF] flex items-center justify-center shadow-2xs">
                <Briefcase className="h-5 w-5 stroke-[2.2]" />
              </div>
            </div>

            {/* Title & User info */}
            <h3 className="text-[17px] font-semibold text-slate-900 tracking-tight leading-snug px-5">
              Recruiter Details
            </h3>
            <p className="text-[13px] text-slate-500 mt-0.5 px-5 leading-normal">
              {inspectUser.full_name} · {inspectUser.email}
            </p>

            {/* iOS Inset Grouped Section */}
            <div className="mx-5 my-4 bg-white/75 rounded-xl divide-y divide-slate-200/70 border border-slate-200/60 text-left text-[13px] overflow-hidden">
              <div className="flex justify-between items-center py-2.5 px-3.5">
                <span className="text-slate-500">Company</span>
                <span className="font-medium text-slate-900">{inspectUser.company || 'Not specified'}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 px-3.5">
                <span className="text-slate-500">Designation</span>
                <span className="font-medium text-slate-900">{inspectUser.position || 'Not specified'}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 px-3.5">
                <span className="text-slate-500">Phone</span>
                <span className="font-medium text-slate-900">{inspectUser.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 px-3.5">
                <span className="text-slate-500">Status</span>
                <span>{getStatusBadge(inspectUser.status)}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 px-3.5">
                <span className="text-slate-500">Registered</span>
                <span className="font-medium text-slate-900">
                  {inspectUser.created_at ? new Date(inspectUser.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {inspectUser.rejection_reason && (
              <div className="mx-5 mb-3 px-3.5 py-2 rounded-xl bg-rose-50/80 text-rose-800 text-left text-[12px] border border-rose-200/60">
                <span className="font-semibold block mb-0.5">Rejection Note:</span>
                {inspectUser.rejection_reason}
              </div>
            )}

            {inspectUser.verified_by && (
              <div className="mx-5 mb-3 px-3.5 py-2 rounded-xl bg-emerald-50/80 text-emerald-800 text-left text-[12px] border border-emerald-200/60">
                <span className="font-semibold block mb-0.5">Audited By:</span>
                {inspectUser.verified_by} {inspectUser.verified_at ? `(${new Date(inspectUser.verified_at).toLocaleDateString()})` : ''}
              </div>
            )}

            {/* iOS Hairline Action Button */}
            <div className="border-t border-slate-300/70">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="w-full py-3.5 text-[17px] font-semibold text-[#007AFF] hover:bg-slate-200/40 active:bg-slate-200/70 transition cursor-pointer select-none text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal (Apple iOS UIAlertController theme) */}
      {approvingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-md select-none animate-in fade-in"
          onClick={() => {
            if (!isProcessing) {
              setApprovingUser(null)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-[275px] sm:w-[295px] max-w-[90vw] rounded-[20px] bg-[#F2F2F7]/92 backdrop-blur-2xl border border-white/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.30)] text-center overflow-hidden animate-in zoom-in-95 duration-200 ease-out select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top iOS Symbol Badge */}
            <div className="pt-5 pb-2 px-5 flex justify-center">
              <div className="h-10 w-10 rounded-full bg-emerald-500/12 text-emerald-600 flex items-center justify-center shadow-2xs">
                <CheckCircle2 className="h-5 w-5 stroke-[2.2]" />
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-[17px] font-semibold text-slate-900 tracking-tight leading-snug px-5">
              Approve Recruiter
            </h3>
            <p className="text-[13px] text-slate-600 mt-1.5 px-5 pb-5 leading-normal font-normal">
              Verify and activate recruiter privileges for <strong className="font-semibold text-slate-900">{approvingUser.full_name}</strong> from <strong className="font-semibold text-slate-900">{approvingUser.company || 'their organization'}</strong>?
            </p>

            {/* iOS Hairline Action Buttons */}
            <div className="border-t border-slate-300/70 grid grid-cols-2 text-[17px]">
              <button
                type="button"
                onClick={() => {
                  setApprovingUser(null)
                }}
                disabled={isProcessing}
                className="py-3.5 font-normal text-[#007AFF] hover:bg-slate-200/40 active:bg-slate-200/70 border-r border-slate-300/70 transition cursor-pointer select-none disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isProcessing}
                className="py-3.5 font-semibold text-emerald-600 hover:bg-emerald-50/50 active:bg-emerald-100/60 transition cursor-pointer select-none disabled:opacity-40"
              >
                {isProcessing ? 'Activating...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal (Apple iOS UIAlertController theme) */}
      {rejectingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-md select-none animate-in fade-in"
          onClick={() => {
            if (!isProcessing) {
              setRejectingUser(null)
              setRejectionReason('')
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-[275px] sm:w-[295px] max-w-[90vw] rounded-[20px] bg-[#F2F2F7]/92 backdrop-blur-2xl border border-white/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.30)] text-center overflow-hidden animate-in zoom-in-95 duration-200 ease-out select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top iOS Symbol Badge */}
            <div className="pt-5 pb-2 px-5 flex justify-center">
              <div className="h-10 w-10 rounded-full bg-rose-500/12 text-[#FF3B30] flex items-center justify-center shadow-2xs">
                <AlertCircle className="h-5 w-5 stroke-[2.2]" />
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-[17px] font-semibold text-slate-900 tracking-tight leading-snug px-5">
              Reject Verification
            </h3>
            <p className="text-[13px] text-slate-600 mt-1.5 px-5 leading-normal font-normal">
              Reject verification for <strong className="font-semibold text-slate-900">{rejectingUser.full_name}</strong>? Provide a reason for the recruiter.
            </p>

            {/* iOS Inset Textarea */}
            <div className="px-5 pt-3 pb-4">
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (required)"
                className="w-full rounded-xl bg-white/80 px-3.5 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 border border-slate-300/70 focus:outline-none focus:border-[#FF3B30] text-left resize-none"
              />
            </div>

            {/* iOS Hairline Action Buttons */}
            <div className="border-t border-slate-300/70 grid grid-cols-2 text-[17px]">
              <button
                type="button"
                onClick={() => {
                  setRejectingUser(null)
                  setRejectionReason('')
                }}
                disabled={isProcessing}
                className="py-3.5 font-normal text-[#007AFF] hover:bg-slate-200/40 active:bg-slate-200/70 border-r border-slate-300/70 transition cursor-pointer select-none disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="py-3.5 font-semibold text-[#FF3B30] hover:bg-rose-50/50 active:bg-rose-100/60 transition cursor-pointer select-none disabled:opacity-40"
              >
                {isProcessing ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Review Modal (Apple iOS Theme) */}
      {profileEditUser && (() => {
        let pd: any = null
        try { pd = profileEditUser.pending_profile ? JSON.parse(profileEditUser.pending_profile) : null } catch {}
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-md select-none animate-in fade-in"
            onClick={() => {
              if (!isProfileProcessing) {
                setProfileEditUser(null)
                setProfileRejectReason('')
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-[320px] sm:w-[360px] max-w-full rounded-[20px] bg-[#F2F2F7]/92 backdrop-blur-2xl border border-white/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.30)] text-center overflow-hidden animate-in zoom-in-95 duration-200 ease-out select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top iOS Symbol Badge */}
              <div className="pt-5 pb-2 px-5 flex justify-center">
                <div className="h-10 w-10 rounded-full bg-blue-500/12 text-[#007AFF] flex items-center justify-center shadow-2xs">
                  <Briefcase className="h-5 w-5 stroke-[2.2]" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-[17px] font-semibold text-slate-900 tracking-tight leading-snug px-5">
                Profile Changes
              </h3>
              <p className="text-[13px] text-slate-500 mt-0.5 px-5 leading-normal">
                {profileEditUser.full_name} · {profileEditUser.email}
              </p>

              {/* iOS Inset Grouped Section for Changes */}
              <div className="mx-5 my-3.5 bg-white/75 rounded-xl divide-y divide-slate-200/70 border border-slate-200/60 text-left text-[13px] overflow-hidden max-h-48 overflow-y-auto">
                {pd ? (
                  <>
                    {pd.full_name && (
                      <div className="flex justify-between items-center py-2 px-3">
                        <span className="text-slate-500">Name</span>
                        <span className="font-medium text-slate-900">{pd.full_name}</span>
                      </div>
                    )}
                    {pd.company && (
                      <div className="flex justify-between items-center py-2 px-3">
                        <span className="text-slate-500">Company</span>
                        <span className="font-medium text-slate-900">{pd.company}</span>
                      </div>
                    )}
                    {pd.position && (
                      <div className="flex justify-between items-center py-2 px-3">
                        <span className="text-slate-500">Role</span>
                        <span className="font-medium text-slate-900">{pd.position}</span>
                      </div>
                    )}
                    {pd.phone && (
                      <div className="flex justify-between items-center py-2 px-3">
                        <span className="text-slate-500">Phone</span>
                        <span className="font-medium text-slate-900">{pd.phone}</span>
                      </div>
                    )}
                    {pd.location && (
                      <div className="flex justify-between items-center py-2 px-3">
                        <span className="text-slate-500">Location</span>
                        <span className="font-medium text-slate-900">{pd.location}</span>
                      </div>
                    )}
                    {pd.headline && (
                      <div className="flex justify-between items-center py-2 px-3">
                        <span className="text-slate-500">Headline</span>
                        <span className="font-medium text-slate-900 truncate max-w-[170px]">{pd.headline}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-2.5 px-3 text-slate-500 text-center">No pending changes found</div>
                )}
              </div>

              {/* iOS Inset Rejection input */}
              <div className="px-5 pb-3">
                <input
                  type="text"
                  value={profileRejectReason}
                  onChange={(e) => setProfileRejectReason(e.target.value)}
                  placeholder="Rejection reason (if rejecting)"
                  className="w-full rounded-xl bg-white/80 px-3.5 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 border border-slate-300/70 focus:outline-none focus:border-[#007AFF] text-left"
                />
              </div>

              {/* iOS 3-Column Hairline Action Buttons */}
              <div className="border-t border-slate-300/70 grid grid-cols-3 text-[15px]">
                <button
                  type="button"
                  onClick={() => {
                    setProfileEditUser(null)
                    setProfileRejectReason('')
                  }}
                  disabled={isProfileProcessing}
                  className="py-3.5 font-normal text-[#007AFF] hover:bg-slate-200/40 active:bg-slate-200/70 border-r border-slate-300/70 transition cursor-pointer select-none disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectProfileEdit}
                  disabled={isProfileProcessing}
                  className="py-3.5 font-semibold text-[#FF3B30] hover:bg-rose-50/50 active:bg-rose-100/60 border-r border-slate-300/70 transition cursor-pointer select-none disabled:opacity-40"
                >
                  {isProfileProcessing ? '...' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveProfileEdit(profileEditUser.id, profileEditUser.full_name)}
                  disabled={isProfileProcessing}
                  className="py-3.5 font-semibold text-emerald-600 hover:bg-emerald-50/50 active:bg-emerald-100/60 transition cursor-pointer select-none disabled:opacity-40"
                >
                  {isProfileProcessing ? '...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
