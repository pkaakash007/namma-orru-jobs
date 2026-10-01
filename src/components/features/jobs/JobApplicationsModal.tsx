import React, { useState, useEffect } from 'react'
import type { Job } from '../../../types'
import {
  FileText,
  X,
  ExternalLink,
  Mail,
  Phone,
  MessageSquare,
  Building2,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { jobsService } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { useLanguage } from '../../../context/LanguageContext'
import { parseDateUTC } from '../../../utils/date'
import { parseSkillsArray } from '../../../utils/skills'

interface JobApplicationItem {
  id: string
  job_id: string
  applicant_user_id?: string
  candidate_name: string
  candidate_email: string
  candidate_phone?: string
  resume_url: string
  status?: string
  created_at: string
  candidate_avatar?: string
  candidate_headline?: string
  candidate_skills?: string
}

interface JobApplicationsModalProps {
  job: Job
  onClose: () => void
  onMessageCandidate?: (userId: string) => void
}

export const JobApplicationsModal: React.FC<JobApplicationsModalProps> = ({
  job,
  onClose,
  onMessageCandidate,
}) => {
  const { language } = useLanguage()
  const { showToast } = useToast()

  const [applications, setApplications] = useState<JobApplicationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await jobsService.getJobApplications(job.id)
      setApplications(res.applications || [])
    } catch (err: any) {
      const msg = err.message || 'Failed to load applications'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [job.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Clean Human Modal Header */}
        <div className="border-b border-slate-100 pb-4 pr-10">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              {job.company_name}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {job.location} ({job.workplace_type})
            </span>
          </div>

          <h2 className="mt-1 text-lg font-bold text-slate-900 tracking-tight">
            {job.title}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {applications.length}{' '}
            {applications.length === 1
              ? language === 'ta'
                ? 'விண்ணப்பதாரர்'
                : language === 'hi'
                ? 'आवेदक'
                : 'applicant'
              : language === 'ta'
              ? 'விண்ணப்பதாரர்கள்'
              : language === 'hi'
              ? 'आवेदक'
              : 'applicants'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-500 mb-2.5" />
              <p className="text-xs font-medium text-slate-600">
                {language === 'ta'
                  ? 'விண்ணப்பங்கள் ஏற்றப்படுகின்றன...'
                  : language === 'hi'
                  ? 'आवेदन लोड हो रहे हैं...'
                  : 'Loading applications...'}
              </p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-red-800">
              <p className="text-sm font-medium">{error}</p>
              <button
                onClick={fetchApplications}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition cursor-pointer"
              >
                {language === 'ta' ? 'மீண்டும் முயற்சி' : language === 'hi' ? 'पुनः प्रयास करें' : 'Try Again'}
              </button>
            </div>
          ) : applications.length === 0 ? (
            /* Genuine Authentic Empty State */
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                {language === 'ta'
                  ? 'விண்ணப்பங்கள் எதுவும் இன்னும் வரவில்லை'
                  : language === 'hi'
                  ? 'अभी तक कोई आवेदन नहीं है'
                  : 'No applications yet'}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                {language === 'ta'
                  ? 'விண்ணப்பதாரர்கள் விண்ணப்பிக்கும்போது அவர்களின் ரெஸ்யூம்கள் இங்கு காண்பிக்கப்படும்.'
                  : language === 'hi'
                  ? 'जब उम्मीदवार आवेदन करेंगे, तो उनके रिज्यूमे यहां दिखाई देंगे।'
                  : 'Submitted applications and resumes for this job opening will appear here.'}
              </p>
            </div>
          ) : (
            /* List of Applicants */
            applications.map((app) => {
              const skills = parseSkillsArray(app.candidate_skills)
              return (
                <div
                  key={app.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Candidate Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      {app.candidate_avatar ? (
                        <img
                          src={app.candidate_avatar}
                          alt={app.candidate_name}
                          className="h-10 w-10 flex-shrink-0 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 font-semibold text-white text-xs">
                          {app.candidate_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 truncate">
                            {app.candidate_name}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {parseDateUTC(app.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {app.candidate_headline && (
                          <p className="text-xs text-slate-600 mt-0.5 font-normal truncate">
                            {app.candidate_headline}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <a
                            href={`mailto:${app.candidate_email}`}
                            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition"
                          >
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span>{app.candidate_email}</span>
                          </a>
                          {app.candidate_phone && (
                            <a
                              href={`tel:${app.candidate_phone}`}
                              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition"
                            >
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              <span>{app.candidate_phone}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Simple Action Buttons */}
                    <div className="flex items-center gap-2 self-start flex-shrink-0">
                      {app.applicant_user_id && onMessageCandidate && (
                        <button
                          type="button"
                          onClick={() => {
                            onMessageCandidate(app.applicant_user_id!)
                            onClose()
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer select-none"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                          <span>{language === 'ta' ? 'தொடர்புகொள்' : language === 'hi' ? 'संपर्क करें' : 'Contact'}</span>
                        </button>
                      )}

                      {app.resume_url && (
                        <a
                          href={app.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer select-none"
                        >
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                          <span>{language === 'ta' ? 'ரெஸ்யூம்' : language === 'hi' ? 'रिज्यूमे' : 'Resume'}</span>
                          <ExternalLink className="h-3 w-3 text-slate-400" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Candidate Skills if any */}
                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-100 pt-2.5">
                      {skills.slice(0, 6).map((skill, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-normal text-slate-600"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {applications.length > 0 && (
              <>
                {applications.length}{' '}
                {applications.length === 1
                  ? language === 'ta'
                    ? 'விண்ணப்பம்'
                    : language === 'hi'
                    ? 'आवेदन'
                    : 'application'
                  : language === 'ta'
                  ? 'விண்ணப்பங்கள்'
                  : language === 'hi'
                  ? 'आवेदन'
                  : 'applications'}
              </>
            )}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            {language === 'ta' ? 'மூடு' : language === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
