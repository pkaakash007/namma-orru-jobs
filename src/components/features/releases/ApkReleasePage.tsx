import React, { useState } from 'react'
import { Card } from '../../ui/Card'
import { Download, Copy, Check, ArrowLeft, QrCode } from 'lucide-react'
import { useToast } from '../../../context/ToastContext'

const APK_URL =
  'https://namma-ooru-jobs-api.apkavin483.workers.dev/api/media/apks/namma-ooru-jobs-latest.apk'

interface ApkReleasePageProps {
  onBackToApp?: () => void
}

export const ApkReleasePage: React.FC<ApkReleasePageProps> = ({ onBackToApp }) => {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    APK_URL
  )}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(APK_URL)
    setCopied(true)
    showToast('Download link copied', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F4F2EE] flex flex-col justify-between text-[#0F172A] p-4">
      {/* Top Header */}
      <div className="max-w-md mx-auto w-full pt-4">
        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2545] hover:text-[#F97316] transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to App</span>
          </button>
        )}
      </div>

      {/* Main Download Card */}
      <main className="flex-1 flex items-center justify-center py-6">
        <Card className="w-full max-w-md p-6 sm:p-8 border-[#E0DFDC] bg-white shadow-sm rounded-xl text-center">
          {/* App Logo */}
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="Namma Ooru Jobs"
              onClick={onBackToApp}
              className="h-28 w-auto rounded-2xl border border-gray-100 p-2 shadow-xs object-contain bg-white cursor-pointer hover:opacity-90 transition"
              title="Return to Home"
            />
          </div>

          {/* Title & Simple Info */}
          <h1 className="text-xl font-bold text-[#0B2545]">Namma Ooru Jobs</h1>
          <p className="text-xs text-slate-500 mt-1">Android App</p>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs text-slate-600 font-medium">
            <span>v1.0.0</span>
            <span>•</span>
            <span>6.7 MB</span>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-2.5">
            <a
              href={APK_URL}
              download="namma-ooru-jobs.apk"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B2545] py-2.5 text-sm font-semibold text-white hover:bg-[#0B2545]/90 transition shadow-xs cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download APK</span>
            </a>

            <button
              onClick={handleCopyLink}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-gray-50 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Copy Download Link</span>
                </>
              )}
            </button>
          </div>

          {/* QR Code */}
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 font-medium">
              <QrCode className="h-3.5 w-3.5 text-slate-400" />
              <span>Or scan with your phone</span>
            </div>
            <img
              src={qrUrl}
              alt="Scan to download"
              className="h-32 w-32 rounded-lg border border-gray-200 p-1"
            />
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 pb-4">
        <span>NAMMA OORU JOBS © 2026</span>
      </footer>
    </div>
  )
}
