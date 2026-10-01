import React from 'react'
import { LegalLayout } from './LegalLayout'

interface PrivacyPolicyPageProps {
  onBackToApp: () => void
  onNavigateToTerms?: () => void
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({
  onBackToApp,
  onNavigateToTerms,
}) => {
  return (
    <LegalLayout
      activeDoc="privacy"
      onSwitchDoc={(doc) => {
        if (doc === 'terms' && onNavigateToTerms) {
          onNavigateToTerms()
        }
      }}
      onBack={onBackToApp}
    >
      {/* ── Document Intro ── */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          1. Introduction & Data Fiduciary Notice
        </h2>
        <p className="text-slate-600 leading-relaxed">
          <strong className="text-slate-900">UIT Global Solutions Private Limited</strong> (&ldquo;Namma Ooru Jobs&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting the privacy, confidentiality, and security of our users (&ldquo;Data Principals&rdquo;). This Privacy Policy explains how we collect, process, store, and safeguard your personal data when you use our web platform (<a href="https://namma-ooru-jobs.pages.dev" className="text-[#0B2545] underline font-medium">namma-ooru-jobs.pages.dev</a>) and our Android mobile application.
        </p>
        <p className="text-slate-600 leading-relaxed">
          This policy is published in accordance with the <strong className="text-slate-900">Digital Personal Data Protection Act, 2023 (DPDP Act 2023)</strong>, the <strong className="text-slate-900">Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong>, and the latest <strong className="text-slate-900">Google Play Store Developer Policies on User Data & Data Safety</strong>.
        </p>
      </div>

      {/* ── Categories of Personal Data Collected ── */}
      <div className="space-y-4 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          2. Personal Data We Collect
        </h2>
        <p className="text-slate-600 leading-relaxed">
          We collect only the personal information strictly necessary to provide authentic employment matchmaking, recruitment verification, and communication services:
        </p>

        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600">
          <li>
            <strong className="text-slate-900">Account & Contact Data:</strong> Full Name, verified mobile number (via WhatsApp / SMS OTP), email address, profile picture (avatar), and date of birth (collected strictly to confirm statutory legal work eligibility of 18+ years).
          </li>
          <li>
            <strong className="text-slate-900">Professional Profile & Resumes:</strong> Uploaded PDF/DOCX resumes, declared employment history, educational qualifications, technical/trade skills, portfolio links, and preferred Tamil Nadu district/location.
          </li>
          <li>
            <strong className="text-slate-900">Recruiter & Company Credentials:</strong> Company / Enterprise name, work email address, recruiter designation, corporate website, and verification documentation submitted for administrator approval.
          </li>
          <li>
            <strong className="text-slate-900">Device & Push Notification Data:</strong> Firebase Cloud Messaging (FCM) device token (used strictly to deliver alerts for job application updates, interview invites, and recruiter chat messages). We do not collect precise GPS tracking.
          </li>
        </ul>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1 text-xs sm:text-sm">
          <p className="font-semibold text-slate-900">Data We Never Collect or Sell</p>
          <p className="text-slate-600 leading-relaxed">
            We never collect bank account details, credit card numbers, or biometric identification. We maintain a strict permanent policy: <strong>we never sell, rent, or trade user data to third-party data brokers, marketers, or advertising networks.</strong>
          </p>
        </div>
      </div>

      {/* ── Lawful Purpose of Data Processing ── */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          3. Lawful Basis & Purposes of Data Processing
        </h2>
        <p className="text-slate-600 leading-relaxed">
          Under Section 4 of the DPDP Act 2023, we process personal data based on informed consent provided by the Data Principal for the following specified purposes:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
          <li><strong>Employment Matchmaking:</strong> Enabling job seekers to search verified openings, submit applications, and connect directly with verified hiring managers in Tamil Nadu.</li>
          <li><strong>Talent Discovery:</strong> Allowing verified HR recruiters to review candidate qualifications, experience, and contact details for active hiring pipelines.</li>
          <li><strong>Transactional Communications:</strong> Sending essential application status updates, interview schedules, and recruiter messages via verified WhatsApp, SMS, or transactional email.</li>
          <li><strong>Platform Security & Anti-Fraud:</strong> Preventing fake job postings, unauthorized scraping, recruitment scams, and maintaining audit logs for compliance with IT Rules 2021.</li>
        </ul>
      </div>

      {/* ── Third-Party Infrastructure & Disclosures ── */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          4. Service Providers & Third-Party Processors
        </h2>
        <p className="text-slate-600 leading-relaxed">
          To maintain high reliability, low-latency edge delivery, and bank-grade data encryption, we partner with industry-standard cloud infrastructure providers under strict Data Processing Agreements:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600">
          <li>
            <strong className="text-slate-900">Cloudflare Inc. (Database & Edge Infrastructure):</strong> Provides encrypted Cloudflare D1 distributed database storage, R2 secure media hosting for CVs, and TLS 1.3 encryption across all network requests.
          </li>
          <li>
            <strong className="text-slate-900">Resend Inc. (Transactional Email):</strong> Delivers authentic transactional job alerts, candidate interest notices, and verification emails over secure REST APIs.
          </li>
          <li>
            <strong className="text-slate-900">Google LLC & Firebase (Authentication & Push Notifications):</strong> Enables Google Sign-In OAuth authentication and Android system notification channel routing (Android 13+ POST_NOTIFICATIONS compliance).
          </li>
        </ul>
      </div>

      {/* ── Account Deletion & Data Erasure ── */}
      <div className="space-y-4 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          5. User Rights: Account Deletion & Right to Erasure
        </h2>
        <p className="text-slate-600 leading-relaxed">
          In strict compliance with the <strong className="text-slate-900">DPDP Act 2023 (Right to Erasure)</strong> and the <strong className="text-slate-900">Google Play Store User Data Deletion Policy</strong>, users have full control over their account and personal information:
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3 text-xs sm:text-sm">
          <p className="font-semibold text-slate-900">
            How to Request Immediate Account & Data Deletion
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
              <p className="font-semibold text-slate-900">Option 1: Direct In-App Deletion</p>
              <p className="leading-relaxed">
                Log into your account &rarr; open <strong>Profile</strong> &rarr; click <strong>Edit Profile</strong> &rarr; scroll to the bottom and select <strong>Delete My Account & Personal Data</strong>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
              <p className="font-semibold text-slate-900">Option 2: Web Deletion Request</p>
              <p className="leading-relaxed">
                Email our Privacy Desk at <a href="mailto:privacy@nammaoorujobs.com" className="text-[#0B2545] underline font-medium">privacy@nammaoorujobs.com</a> from your registered email address with the subject &ldquo;Account Deletion Request&rdquo;.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong>Retention & Deletion Timeline:</strong> Upon receiving your verified deletion request, all your personal records, uploaded resumes, contact information, and message histories are permanently erased from our production databases within <strong>thirty (30) days</strong>.
          </p>
        </div>
      </div>

      {/* ── Protection of Minors ── */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          6. Protection of Minors (18+ Requirement)
        </h2>
        <p className="text-slate-600 leading-relaxed">
          Under Section 9 of the DPDP Act 2023, Namma Ooru Jobs does not knowingly collect or process personal data of individuals under eighteen (18) years of age. If we become aware that an account has been registered by a minor, we will immediately take steps to terminate the account and purge all associated personal data from our systems.
        </p>
      </div>

      {/* ── Grievance Redressal Officer Contact ── */}
      <div className="space-y-4 pt-2">
        <h2 className="text-xl font-bold text-[#0B2545] tracking-tight">
          7. Data Protection & Grievance Redressal Officer
        </h2>
        <p className="text-slate-600 leading-relaxed">
          If you have any questions, requests to exercise your Data Principal rights (access, correction, erasure), or grievances regarding data processing, you may reach our designated Grievance Officer:
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3 text-xs sm:text-sm text-slate-600">
          <div className="border-b border-slate-200 pb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Protection & Grievance Officer</p>
            <p className="text-base font-bold text-[#0B2545] mt-0.5">S. Kavin, Compliance & Legal Affairs</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="font-semibold text-slate-900">Email for Privacy Requests & Grievances:</p>
              <a href="mailto:privacy@nammaoorujobs.com" className="text-[#0B2545] hover:underline font-medium">
                privacy@nammaoorujobs.com
              </a>
            </div>

            <div>
              <p className="font-semibold text-slate-900">Data Fiduciary Entity:</p>
              <p className="text-slate-600">UIT Global Solutions Private Limited</p>
            </div>

            <div className="sm:col-span-2">
              <p className="font-semibold text-slate-900">Registered Office Address:</p>
              <p className="text-slate-600">
                No. 14/2, Anna Salai, Guindy, Chennai, Tamil Nadu 600032, India
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          All complaints and deletion requests will be acknowledged within 24 to 48 hours and resolved within fifteen (15) to thirty (30) days in compliance with the Digital Personal Data Protection Act, 2023.
        </p>
      </div>
    </LegalLayout>
  )
}
