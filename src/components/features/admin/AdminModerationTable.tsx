import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Lock,
  Unlock,
} from 'lucide-react'
import type { UserViolation, Language } from '../../../types'
import { moderationService } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'

interface AdminModerationTableProps {
  lang: Language
}

export const AdminModerationTable: React.FC<AdminModerationTableProps> = ({ lang }) => {
  const { showToast } = useToast()
  const [violations, setViolations] = useState<UserViolation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [page] = useState(1)

  // Translations
  const t = {
    title: lang === 'ta' ? 'உள்ளடக்கப் பாதுகாப்பு & தணிக்கை தணிக்கை மையம்' : lang === 'hi' ? 'सामग्री सुरक्षा और मॉडरेशन ऑडिट' : 'Content Moderation & Safety Audit',
    subtitle: lang === 'ta' ? 'AI பாதுகாப்புக் கொள்கை மீறல்கள் மற்றும் பயனர் கணக்கு இடைநீக்கங்களின் தணிக்கை அறிக்கை' : lang === 'hi' ? 'सामग्री नीति उल्लंघन और खाता निलंबन की ऑडिट रिपोर्ट' : 'Audit log of detected policy violations, automated content rejections, and suspensions',
    user: lang === 'ta' ? 'பயனர்' : lang === 'hi' ? 'उपयोगकर्ता' : 'User',
    violationType: lang === 'ta' ? 'மீறல் வகை' : lang === 'hi' ? 'उल्लंघन प्रकार' : 'Violation Type',
    contentType: lang === 'ta' ? 'உள்ளடக்க வகை' : lang === 'hi' ? 'सामग्री प्रकार' : 'Content Type',
    severity: lang === 'ta' ? 'தீவிரம்' : lang === 'hi' ? 'गंभीरता' : 'Severity',
    reason: lang === 'ta' ? 'காரணம்' : lang === 'hi' ? 'कारण' : 'Reason / Classification',
    status: lang === 'ta' ? 'கணக்கு நிலை' : lang === 'hi' ? 'खाता स्थिति' : 'Account Status',
    expires: lang === 'ta' ? 'முடிவடையும் நேரம்' : lang === 'hi' ? 'समाप्ति समय' : 'Suspension Expiry',
    actions: lang === 'ta' ? 'நடவடிக்கைகள்' : lang === 'hi' ? 'कार्रवाई' : 'Actions',
    reactivate: lang === 'ta' ? 'கணக்கை மீண்டும் இயக்கு' : lang === 'hi' ? 'खाता पुनः सक्रिय करें' : 'Reactivate',
    suspend: lang === 'ta' ? 'இடைநீக்கம் நீட்டி' : lang === 'hi' ? 'निलंबन बढ़ाएं' : 'Extend 24h',
    noViolations: lang === 'ta' ? 'கொள்கை மீறல்கள் எதுவும் பதிவு செய்யப்படவில்லை' : lang === 'hi' ? 'कोई नीति उल्लंघन दर्ज नहीं' : 'No policy violations on record. All user content is within safety guidelines.',
  }

  const loadViolations = async () => {
    setLoading(true)
    try {
      const res = await moderationService.getViolations(page, 20)
      setViolations(res.violations)
    } catch (err) {
      console.error('Failed to load violations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadViolations()
  }, [page])

  const handleReactivate = async (userId: string) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      await moderationService.reactivateUser(userId)
      setViolations((prev) =>
        prev.map((v) =>
          v.user_id === userId
            ? { ...v, user_is_active: true, user_status: 'active', deactivated_until: null }
            : v
        )
      )
    } catch (err: any) {
      showToast(err.message || 'Failed to reactivate user', 'error')
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const handleSuspend = async (userId: string) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      const res = await moderationService.suspendUser(userId, 24, 'Extended 24-hr suspension by administrator')
      setViolations((prev) =>
        prev.map((v) =>
          v.user_id === userId
            ? {
                ...v,
                user_is_active: false,
                user_status: 'deactivated',
                deactivated_until: res.deactivated_until,
              }
            : v
        )
      )
    } catch (err: any) {
      showToast(err.message || 'Failed to suspend user', 'error')
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E0DFDC] shadow-xs p-6 mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-[#0F172A]">
              {t.title}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {t.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={loadViolations}
          className="self-start sm:self-auto p-2 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <RefreshCw className="w-6 h-6 text-[#0B2545] animate-spin" />
        </div>
      ) : violations.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">
            {t.noViolations}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-3">{t.user}</th>
                <th className="pb-3 px-3">{t.violationType}</th>
                <th className="pb-3 px-3">{t.contentType}</th>
                <th className="pb-3 px-3">{t.severity}</th>
                <th className="pb-3 px-3">{t.reason}</th>
                <th className="pb-3 px-3">{t.status}</th>
                <th className="pb-3 px-3">{t.expires}</th>
                <th className="pb-3 px-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {violations.map((v) => {
                const isSuspended = v.user_is_active === false || v.user_status === 'deactivated' || v.user_status === 'suspended'
                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0B2545] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {v.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#0F172A] truncate">
                            {v.full_name || 'Member'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{v.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-semibold text-red-600">
                        {v.violation_type}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold">
                        {v.content_type}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(
                          v.severity
                        )}`}
                      >
                        {v.severity}
                      </span>
                    </td>

                    <td className="py-3 px-3 max-w-xs text-xs text-slate-600 leading-snug">
                      {v.reason}
                    </td>

                    <td className="py-3 px-3">
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs">
                          <Lock className="w-3 h-3" />
                          <span>Suspended</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                          <Unlock className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {v.deactivated_until ? (
                        <span className="font-mono text-[10px]">
                          {new Date(v.deactivated_until).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {isSuspended ? (
                        <button
                          type="button"
                          onClick={() => handleReactivate(v.user_id)}
                          disabled={actionLoading[v.user_id]}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>{t.reactivate}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSuspend(v.user_id)}
                          disabled={actionLoading[v.user_id]}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Lock className="w-3 h-3" />
                          <span>{t.suspend}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
