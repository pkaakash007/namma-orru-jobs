import React from 'react'
import { ArrowLeft, Shield, FileText, Printer } from 'lucide-react'

interface LegalLayoutProps {
  activeDoc: 'terms' | 'privacy'
  onSwitchDoc: (doc: 'terms' | 'privacy') => void
  onBack: () => void
  children: React.ReactNode
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  activeDoc,
  onSwitchDoc,
  onBack,
  children,
}) => {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#0B2545] selection:text-white">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Back button & Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
              title="Return to application"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>

            <div
              onClick={onBack}
              className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition pl-1"
            >
              <img
                src="/logo.png"
                alt="Namma Ooru Jobs"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/logo-icon.png'
                }}
              />
              <span className="hidden sm:inline text-xs font-black tracking-tight text-[#0B2545]">
                NAMMA OORU <span className="text-[#F97316]">JOBS</span>
              </span>
            </div>
          </div>

          {/* Document Switcher Pill */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onSwitchDoc('terms')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeDoc === 'terms'
                  ? 'bg-white text-[#0B2545] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Terms of Service</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchDoc('privacy')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeDoc === 'privacy'
                  ? 'bg-white text-[#0B2545] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Privacy Policy</span>
            </button>
          </div>

          {/* Print button */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              title="Print document"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Document Subheader Badge ── */}
      <section className="bg-white border-b border-slate-200/70 py-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0B2545] tracking-tight">
              {activeDoc === 'terms' ? 'Terms of Service' : 'Privacy & Data Protection Policy'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Operated by UIT Global Solutions Private Limited &bull; Tamil Nadu, India
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Last Updated & Effective Date
            </p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">October 1, 2026</p>
            <p className="text-[11px] text-slate-400">Version 2.4 &bull; Legal Compliance</p>
          </div>
        </div>
      </section>

      {/* ── Main Content Body ── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-10 shadow-xs space-y-8 leading-relaxed text-sm text-slate-700">
          {children}
        </div>
      </main>

      {/* ── Official Compliance Footer ── */}
      <footer className="mt-auto bg-white border-t border-slate-200/80 py-8 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-bold text-[#0B2545]">
              NAMMA OORU <span className="text-[#F97316]">JOBS</span> &bull; Legal Compliance Desk
            </p>
            <p className="text-[11px] text-slate-400">
              Information Technology Act 2000 &bull; DPDP Act 2023 &bull; Google Play Developer Policy
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <button
              onClick={() => onSwitchDoc('terms')}
              className={`hover:text-[#0B2545] transition ${activeDoc === 'terms' ? 'font-bold text-[#0B2545]' : ''}`}
            >
              Terms of Service
            </button>
            <span>&bull;</span>
            <button
              onClick={() => onSwitchDoc('privacy')}
              className={`hover:text-[#0B2545] transition ${activeDoc === 'privacy' ? 'font-bold text-[#0B2545]' : ''}`}
            >
              Privacy Policy
            </button>
            <span>&bull;</span>
            <button onClick={onBack} className="hover:text-[#0B2545] transition">
              Home
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
