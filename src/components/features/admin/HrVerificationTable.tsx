import React, { useState, useEffect, useCallback } from 'react'
import type { HrVerificationAccount, HrVerificationsResponse } from '../../../types'
import { adminService, hrService } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'
import {
  ShieldAlert,
  Clock,
  Search,
  Building2,
  Briefcase,
  Phone,
  Check,
  X,
  Eye,
  RefreshCw,
  UserCheck,
} from 'lucide-react'

interface HrVerificationTableProps {
  onRefreshStats?: () => void
}

type FilterStatus = 'pending' | 'active' | 'rejected' | 'all'

export const HrVerificationTable: React.FC<HrVerificationTableProps> = ({ onRefreshStats }) => {
  const { showToast } = useToast()

  const [verifications, setVerifications] = useState<HrVerificationAccount[]>([])
  const [counts, setCounts] = useState({ pending: 0, active: 0, rejected: 0, total: 0 })
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Modals state
  const [inspectUser, setInspectUser] = useState<HrVerificationAccount | null>(null)
  const [approvingUser, setApprovingUser] = useState<HrVerificationAccount | null>(null)
  const [rejectingUser, setRejectingUser] = useState<HrVerificationAccount | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
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
      const res = await adminService.approveHrVerification(approvingUser.id, approvalNotes)
      showToast(res.message || `Approved ${approvingUser.full_name}`, 'success')
      setApprovingUser(null)
      setApprovalNotes('')
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
      return <Badge variant="success">ACTIVE</Badge>
    }
    if (s === 'REJECTED') {
      return <Badge variant="danger">REJECTED</Badge>
    }
    return <Badge variant="warning">PENDING VERIFICATION</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <Card className="p-5 sm:p-6 shadow-xs border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                <Briefcase className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                HR Recruiter Account Verification
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Review and audit employer credentials before granting job publishing and candidate access across Tamil Nadu.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchVerifications(activeFilter)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setActiveFilter('pending')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Pending Review</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                activeFilter === 'pending' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('active')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            <span>Approved / Active</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                activeFilter === 'active' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('rejected')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <X className="h-3.5 w-3.5" />
            <span>Rejected</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                activeFilter === 'rejected' ? 'bg-rose-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts.rejected}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Recruiters</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                activeFilter === 'all' ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts.total}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
          />
        </div>
      </Card>

      {/* Recruiter Accounts Table / List */}
      <Card className="overflow-hidden border-slate-200 shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="mx-auto h-7 w-7 text-orange-500 animate-spin" />
            <p className="mt-2 text-xs font-semibold text-slate-500">Loading recruiter verifications...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <UserCheck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {searchQuery ? 'No recruiters match your search' : 'No recruiter accounts found'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {activeFilter === 'pending'
                ? 'All HR recruiter accounts have been audited and verified. Genuine empty state.'
                : 'No recruiter accounts in this category.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Recruiter</th>
                  <th className="py-3 px-4">Company & Position</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((recruiter) => {
                  const s = (recruiter.status || '').toUpperCase()
                  const isPending = s === 'PENDING_VERIFICATION' || s === 'PENDING'
                  const isUserRejected = s === 'REJECTED'

                  return (
                    <tr key={recruiter.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Recruiter Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 font-bold text-xs uppercase">
                            {recruiter.full_name ? recruiter.full_name.charAt(0) : 'H'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {recruiter.full_name || 'Unnamed Recruiter'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{recruiter.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Company & Position */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{recruiter.company || 'Not specified'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Briefcase className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{recruiter.position || 'Recruiter'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Phone */}
                      <td className="py-3 px-4 text-slate-600">
                        {recruiter.phone ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{recruiter.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {getStatusBadge(recruiter.status)}
                          {isUserRejected && recruiter.rejection_reason && (
                            <p className="text-[10px] text-rose-600 truncate max-w-[180px]" title={recruiter.rejection_reason}>
                              Reason: {recruiter.rejection_reason}
                            </p>
                          )}
                          {recruiter.verified_by && (
                            <p className="text-[10px] text-slate-400">
                              By: {recruiter.verified_by}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                        {recruiter.created_at
                          ? new Date(recruiter.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectUser(recruiter)}
                            title="Inspect Details"
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => setApprovingUser(recruiter)}
                                title="Approve Recruiter"
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 cursor-pointer"
                              >
                                <Check className="h-3 w-3" />
                                Approve
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingUser(recruiter)
                                  setRejectionReason('')
                                }}
                                title="Reject Recruiter"
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 active:scale-95 cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                                Reject
                              </button>
                            </>
                          )}

                          {isUserRejected && (
                            <button
                              type="button"
                              onClick={() => setApprovingUser(recruiter)}
                              title="Reconsider & Approve"
                              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
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
                              title="Revoke Verification"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:border-rose-200 hover:text-rose-600 cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}

                          {recruiter.pending_profile && (
                            <button
                              type="button"
                              onClick={() => setProfileEditUser(recruiter)}
                              title="Review profile edit request"
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 active:scale-95 cursor-pointer"
                            >
                              <Clock className="h-3 w-3" />
                              Profile Edit
                            </button>
                          )}
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

      {/* Inspect Recruiter Modal */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                  <Briefcase className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Recruiter Profile Inspection</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{inspectUser.full_name}</p>
                  <p className="text-slate-500">{inspectUser.email}</p>
                </div>
                {getStatusBadge(inspectUser.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-slate-100 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{inspectUser.company || 'Not specified'}</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Position</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{inspectUser.position || 'Not specified'}</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{inspectUser.phone || 'Not provided'}</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {inspectUser.created_at ? new Date(inspectUser.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              {inspectUser.rejection_reason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-rose-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Rejection Reason</span>
                  <p className="mt-0.5 text-xs">{inspectUser.rejection_reason}</p>
                </div>
              )}

              {inspectUser.verified_by && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-emerald-950">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Audited By Admin</span>
                  <p className="mt-0.5 text-xs">
                    {inspectUser.verified_by} {inspectUser.verified_at ? `on ${new Date(inspectUser.verified_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approvingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Approve HR Recruiter Account</h3>
                <p className="text-xs text-slate-500">Grants full recruiter & job posting privileges</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to verify and activate the recruiter account for{' '}
              <span className="font-bold text-slate-900">{approvingUser.full_name}</span> (
              {approvingUser.email}) from <span className="font-bold text-slate-900">{approvingUser.company || 'their organization'}</span>?
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Verification Notes (Optional)
              </label>
              <input
                type="text"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setApprovingUser(null)
                  setApprovalNotes('')
                }}
                disabled={isProcessing}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isProcessing}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? 'Activating...' : 'Approve & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Reject HR Recruiter Verification</h3>
                <p className="text-xs text-slate-500">Provide an audit reason for rejecting this recruiter</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Rejecting verification for{' '}
              <span className="font-bold text-slate-900">{rejectingUser.full_name}</span> (
              {rejectingUser.email}). The user will see this message upon accessing recruiter features.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectingUser(null)
                  setRejectionReason('')
                }}
                disabled={isProcessing}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Review Modal */}
      {profileEditUser && (() => {
        let pd: any = null
        try { pd = profileEditUser.pending_profile ? JSON.parse(profileEditUser.pending_profile) : null } catch {}
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Review Profile Edit Request</h3>
                <p className="text-xs text-slate-500 mt-0.5">{profileEditUser.full_name} — {profileEditUser.email}</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {pd ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Requested Changes</p>
                    {pd.full_name && <p className="text-xs text-slate-800"><span className="font-semibold">Name:</span> {pd.full_name}</p>}
                    {pd.company && <p className="text-xs text-slate-800"><span className="font-semibold">Company:</span> {pd.company}</p>}
                    {pd.position && <p className="text-xs text-slate-800"><span className="font-semibold">Designation:</span> {pd.position}</p>}
                    {pd.phone && <p className="text-xs text-slate-800"><span className="font-semibold">Phone:</span> {pd.phone}</p>}
                    {pd.location && <p className="text-xs text-slate-800"><span className="font-semibold">Location:</span> {pd.location}</p>}
                    {pd.headline && <p className="text-xs text-slate-800"><span className="font-semibold">Headline:</span> {pd.headline}</p>}
                    {pd.bio && <p className="text-xs text-slate-800"><span className="font-semibold">About:</span> {pd.bio}</p>}
                    {pd.submitted_at && <p className="text-[11px] text-slate-400">Submitted: {new Date(pd.submitted_at).toLocaleString()}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No pending data found.</p>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Rejection reason (optional)</label>
                  <textarea
                    rows={2}
                    value={profileRejectReason}
                    onChange={(e) => setProfileRejectReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 px-5 pb-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setProfileEditUser(null); setProfileRejectReason('') }}
                  disabled={isProfileProcessing}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectProfileEdit}
                  disabled={isProfileProcessing}
                  className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                >
                  {isProfileProcessing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveProfileEdit(profileEditUser.id, profileEditUser.full_name)}
                  disabled={isProfileProcessing}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {isProfileProcessing ? 'Processing...' : 'Approve & Merge'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
