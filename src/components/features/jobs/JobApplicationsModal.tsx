import React, { useState, useEffect } from 'react'
import type { Job } from '../../../types'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import {
  FileText,
  X,
  ExternalLink,
  Mail,
  Phone,
  Clock,
  User,
  CheckCircle2,
  Briefcase,
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
  const { t, language } = useLanguage()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
      <Card className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[24px] border-white/60 bg-[#F2F2F7]/95 backdrop-blur-2xl p-6 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-slate-200/80 pb-4 pr-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#EA580C]">
              <Briefcase className="h-3 w-3" />
              {language === 'ta'
                ? 'வேலை விண்ணப்பங்கள்'
                : language === 'hi'
                ? 'नौकरी आवेदन'
                : 'Job Applications'}
            </span>
            <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {applications.length}{' '}
              {applications.length === 1
                ? language === 'ta'
                  ? 'விண்ணப்பதாரர்'
                  : language === 'hi'
                  ? 'आवेदक'
                  : 'candidate'
                : language === 'ta'
                ? 'விண்ணப்பதாரர்கள்'
                : language === 'hi'
                ? 'आवेदक'
                : 'candidates'}
            </span>
          </div>

          <h2 className="mt-1 text-xl font-bold text-[#0B2545]">{job.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-semibold text-slate-800">
              <Building2 className="h-3.5 w-3.5 text-[#0B2545]" />
              {job.company_name}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {job.location} ({job.workplace_type})
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin text-[#F97316] mb-3" />
              <p className="text-sm font-medium">
                {language === 'ta'
                  ? 'விண்ணப்பங்கள் ஏற்றப்படுகின்றன...'
                  : language === 'hi'
                  ? 'आवेदन लोड हो रहे हैं...'
                  : 'Loading submitted applications...'}
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-6 text-center text-red-800">
              <p className="font-semibold text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchApplications}
                className="mt-3 font-semibold cursor-pointer"
              >
                {language === 'ta' ? 'மீண்டும் முயற்சி' : language === 'hi' ? 'पुनः प्रयास करें' : 'Try Again'}
              </Button>
            </div>
          ) : applications.length === 0 ? (
            /* Genuine Authentic Empty State */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-[#F97316] mb-3.5">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {language === 'ta'
                  ? 'விண்ணப்பங்கள் எதுவும் இன்னும் வரவில்லை'
                  : language === 'hi'
                  ? 'अभी तक कोई आवेदन प्राप्त नहीं हुआ'
                  : 'No Applications Received Yet'}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                {language === 'ta'
                  ? 'விண்ணப்பதாரர்கள் இந்த வேலை வாய்ப்பிற்கு விண்ணப்பிக்கும்போது அவர்களின் விவரங்கள் மற்றும் ரெஸ்யூம்கள் இங்கு தோன்றும்.'
                  : language === 'hi'
                  ? 'जब उम्मीदवार इस नौकरी के लिए आवेदन करेंगे, तो उनके विवरण और रिज्यूमे यहां दिखाई देंगे।'
                  : 'When candidates apply for this job opening, their profiles, contact details, and resume documents will appear right here.'}
              </p>
            </div>
          ) : (
            /* List of Candidate Applications */
            applications.map((app) => {
              const skills = parseSkillsArray(app.candidate_skills)
              return (
                <div
                  key={app.id}
                  className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Candidate Info */}
                    <div className="flex items-start gap-3">
                      {app.candidate_avatar ? (
                        <img
                          src={app.candidate_avatar}
                          alt={app.candidate_name}
                          className="h-11 w-11 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#0B2545] font-bold text-white text-sm">
                          {app.candidate_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">
                            {app.candidate_name}
                          </h4>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            {t('jobs_applied')}
                          </span>
                        </div>
                        {app.candidate_headline && (
                          <p className="text-xs text-slate-600 mt-0.5 font-medium line-clamp-1">
                            {app.candidate_headline}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <a
                            href={`mailto:${app.candidate_email}`}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-[#0B2545] hover:underline"
                          >
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span>{app.candidate_email}</span>
                          </a>
                          {app.candidate_phone && (
                            <a
                              href={`tel:${app.candidate_phone}`}
                              className="inline-flex items-center gap-1 text-slate-700 hover:text-[#0B2545] hover:underline"
                            >
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              <span>{app.candidate_phone}</span>
                            </a>
                          )}
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{parseDateUTC(app.created_at).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-start">
                      {app.applicant_user_id && onMessageCandidate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            onMessageCandidate(app.applicant_user_id!)
                            onClose()
                          }}
                          className="rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <User className="h-3.5 w-3.5 mr-1 text-[#0B2545]" />
                          {language === 'ta' ? 'தொடர்புகொள்' : language === 'hi' ? 'संपर्क करें' : 'Contact'}
                        </Button>
                      )}

                      {app.resume_url && (
                        <a
                          href={app.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#0B2545] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#134074] shadow-xs cursor-pointer select-none"
                        >
                          <FileText className="h-3.5 w-3.5 text-orange-400" />
                          <span>{language === 'ta' ? 'ரெஸ்யூம் காண்க' : language === 'hi' ? 'रिज्यूमे देखें' : 'View Resume'}</span>
                          <ExternalLink className="h-3 w-3 text-white/70" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Candidate Skills if any */}
                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                      {skills.slice(0, 6).map((skill, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                      {skills.length > 6 && (
                        <span className="text-[11px] text-slate-400 self-center">
                          +{skills.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200/80 pt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {applications.length > 0 && (
              <>
                {language === 'ta'
                  ? `மொத்தம் ${applications.length} விண்ணப்பங்கள்`
                  : language === 'hi'
                  ? `कुल ${applications.length} आवेदन`
                  : `Total ${applications.length} application${applications.length === 1 ? '' : 's'}`}
              </>
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer font-semibold">
            {language === 'ta' ? 'மூடு' : language === 'hi' ? 'बंद करें' : 'Close'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
