import React from 'react'
import { LegalLayout } from './LegalLayout'

interface TermsPageProps {
  onBackToApp: () => void
  onNavigateToPrivacy?: () => void
}

export const TermsPage: React.FC<TermsPageProps> = ({
  onBackToApp,
  onNavigateToPrivacy,
}) => {
  return (
    <LegalLayout
      activeDoc="terms"
      onSwitchDoc={(doc) => {
        if (doc === 'privacy' && onNavigateToPrivacy) {
          onNavigateToPrivacy()
        }
      }}
      onBack={onBackToApp}
    >
      {/* ── Document Intro ── */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          1. Agreement to Terms & Governing Jurisdiction
        </h2>
        <p className="text-slate-600 leading-relaxed">
          Welcome to <strong className="text-slate-900">Namma Ooru Jobs</strong>, a digital employment matchmaking and professional community platform operated and maintained by <strong className="text-slate-900">UIT Global Solutions Private Limited</strong> (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), registered under the Companies Act, 2013 in Tamil Nadu, India.
        </p>
        <p className="text-slate-600 leading-relaxed">
          By accessing our website (<a href="https://namma-ooru-jobs.pages.dev" className="text-[#0B2545] underline font-medium">namma-ooru-jobs.pages.dev</a>), our mobile applications on the Google Play Store, or any associated APIs and communication services, you agree to be bound by these Terms of Service. These terms constitute an electronic record within the meaning of the <strong className="text-slate-900">Information Technology Act, 2000</strong> and the rules thereunder, including the <strong className="text-slate-900">Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong> and the <strong className="text-slate-900">Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>.
        </p>
      </div>

      {/* ── Government Non-Affiliation Disclaimer ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Statutory Notice &bull; Independent Platform</p>
        <p className="text-slate-600 leading-relaxed">
          <strong>Namma Ooru Jobs is an independent technology platform</strong> dedicated to empowering private enterprise hiring and verified career connections across Tamil Nadu. We are <strong>not</strong> an official department, undertaking, or recruiting agency of the Government of Tamil Nadu or the Government of India. Any references to public sector job announcements or district employment cluster data are compiled solely for informational awareness and direct users to official portals.
        </p>
      </div>

      {/* ── Strict Zero-Fee Policy for Job Seekers ── */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          2. Permanent Zero-Fee Guarantee for Job Seekers
        </h2>
        <p className="text-slate-600 leading-relaxed">
          In strict compliance with Indian labour regulations, the <strong className="text-slate-900">Emigration Act, 1983</strong>, and the directives of the Ministry of Labour and Employment:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
          <li><strong>100% Free for Candidates:</strong> Registration, profile creation, CV uploading, job searching, direct applications, and recruiter messaging are <strong>completely free</strong> for all job seekers.</li>
          <li><strong>Prohibition of Candidate Fees:</strong> No employer, hiring partner, recruiter, or third party is permitted to demand registration fees, interview security deposits, training charges, application processing fees, or equipment deposits from job seekers on Namma Ooru Jobs.</li>
          <li><strong>Zero Tolerance for Scams:</strong> Any recruiter found soliciting money from a candidate will have their account immediately suspended, their verified status revoked, and may be reported to state law enforcement and cybercrime authorities.</li>
        </ul>
      </div>

      {/* ── User Eligibility & Play Store Policy ── */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          3. Eligibility, Age Verification & Account Security
        </h2>
        <p className="text-slate-600 leading-relaxed">
          In accordance with the Indian Contract Act, 1872 and Google Play Store Developer Guidelines on child safety and youth protection:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600">
          <li>
            <strong className="text-slate-900">Minimum Age (18+ Years):</strong> You must be at least 18 years of age to register an account or apply for employment. Our services are strictly intended for adults legally entitled to work.
          </li>
          <li>
            <strong className="text-slate-900">Authentication & Verification:</strong> Users authenticate securely via Google OAuth or verified phone OTP. You are responsible for safeguarding your login credentials and session tokens.
          </li>
        </ul>
      </div>

      {/* ── Recruiter & Employer Rules ── */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          4. Employer & Recruiter Obligations
        </h2>
        <p className="text-slate-600 leading-relaxed">
          Recruiters and Human Resource managers registered on Namma Ooru Jobs must undergo administrator verification before gaining access to candidate directories and posting job listings. Recruiters agree to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
          <li><strong>Legitimate Job Openings:</strong> Post only genuine, existing employment opportunities with accurate compensation, job descriptions, and workplace locations.</li>
          <li><strong>Confidentiality of Candidate Resumes:</strong> Treat all applicant resumes, phone numbers, and portfolio links as strictly confidential, using them solely for legitimate recruitment evaluation.</li>
          <li><strong>Anti-Discrimination Norms:</strong> Abide by Equal Remuneration principles and refrain from discriminatory hiring criteria based on caste, religion, gender, or race as guaranteed under the Constitution of India.</li>
        </ul>
      </div>

      {/* ── Intermediary Guidelines & Prohibited Content ── */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          5. Prohibited Conduct & Community Standards (IT Rules 2021)
        </h2>
        <p className="text-slate-600 leading-relaxed">
          Under Rule 3(1)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, users are strictly prohibited from hosting, displaying, uploading, modifying, publishing, or sharing any content that:
        </p>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs sm:text-sm text-slate-700">
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>Belongs to another person and to which the user has no legal right;</li>
            <li>Is defamatory, obscene, pornographic, paedophilic, invasive of another&rsquo;s privacy, insulting or harassing on the basis of gender, libellous, or racially or ethnically objectionable;</li>
            <li>Promotes multi-level marketing (MLM), get-rich-quick schemes, betting, gambling, or fraudulent recruitment;</li>
            <li>Threatens the unity, integrity, defense, security, or sovereignty of India, friendly relations with foreign States, or public order;</li>
            <li>Contains software viruses, malware, or code designed to disrupt, destroy, or limit the functionality of computer resources;</li>
            <li>Impersonates another person or deceives candidates regarding the identity of the employer.</li>
          </ul>
        </div>
        <p className="text-xs text-slate-500">
          Violations will result in immediate content removal, account termination, and notification to cyber authorities within the statutory timeframe mandated by law.
        </p>
      </div>

      {/* ── Content Ownership & Licensing ── */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          6. User Content & Intellectual Property
        </h2>
        <p className="text-slate-600 leading-relaxed">
          You retain full ownership of the resumes, text posts, and media you submit. By uploading content to Namma Ooru Jobs, you grant UIT Global Solutions a non-exclusive, royalty-free, limited license to store, process, display, and transmit such content solely to enable employment matchmaking, notification broadcasts, and platform functionality.
        </p>
        <p className="text-slate-600 leading-relaxed">
          All platform interface designs, trademarks, software code, logos, and algorithms remain the exclusive intellectual property of UIT Global Solutions Private Limited.
        </p>
      </div>

      {/* ── Grievance Redressal Officer ── */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          7. Grievance Redressal Mechanism (Mandatory Statutory Disclosure)
        </h2>
        <p className="text-slate-600 leading-relaxed">
          In accordance with <strong className="text-slate-900">Rule 3(2) of the Information Technology (Intermediary Guidelines) Rules, 2021</strong> and the <strong className="text-slate-900">Digital Personal Data Protection Act, 2023</strong>, Namma Ooru Jobs has designated a Grievance Redressal Officer.
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3 text-xs sm:text-sm text-slate-600">
          <div className="border-b border-slate-200 pb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Grievance Redressal Officer</p>
            <p className="text-base font-bold text-[#0B2545] mt-0.5">S. Kavin, Compliance & Legal Affairs</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="font-semibold text-slate-900">Email for Grievances:</p>
              <a href="mailto:grievance@nammaoorujobs.com" className="text-[#0B2545] hover:underline font-medium">
                grievance@nammaoorujobs.com
              </a>
            </div>

            <div>
              <p className="font-semibold text-slate-900">Corporate Entity:</p>
              <p className="text-slate-600">UIT Global Solutions Private Limited</p>
            </div>

            <div className="sm:col-span-2">
              <p className="font-semibold text-slate-900">Physical Registered Address:</p>
              <p className="text-slate-600">
                No. 14/2, Anna Salai, Guindy, Chennai, Tamil Nadu 600032, India
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          The Grievance Officer shall acknowledge receipt of any complaint within twenty-four to forty-eight hours and dispose of such grievance within fifteen to thirty days as mandated under Indian law.
        </p>
      </div>
    </LegalLayout>
  )
}
