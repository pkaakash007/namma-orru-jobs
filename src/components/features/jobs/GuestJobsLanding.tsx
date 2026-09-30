import React from 'react'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { useLanguage } from '../../../context/LanguageContext'
import { Lock, ArrowRight } from 'lucide-react'

interface GuestJobsLandingProps {
  totalJobsCount: number
  onNavigateToLogin: () => void
  onNavigateToHome?: () => void
}

const POPULAR_SECTORS_MAP: Record<string, { en: string; ta: string; hi: string }> = {
  soft_eng: { en: 'Software Engineering', ta: 'மென்பொருள் பொறியியல்', hi: 'सॉफ्टवेयर इंजीनियरिंग' },
  full_stack: { en: 'Full Stack Development', ta: 'முழு அடுக்கு உருவாக்கம்', hi: 'फुल स्टैक डेवलपमेंट' },
  data_ai: { en: 'Data Science & AI', ta: 'தரவு அறிவியல் & AI', hi: 'डेटा साइंस और एआई' },
  hr: { en: 'Human Resources (HR)', ta: 'மனிதவளம் (HR)', hi: 'मानव संसाधन (HR)' },
  sales_mkt: { en: 'Sales & Marketing', ta: 'விற்பனை & சந்தைப்படுத்தல்', hi: 'बिक्री और विपणन' },
  finance: { en: 'Finance & Accounting', ta: 'நிதி & கணக்கியல்', hi: 'वित्त और लेखा' },
  ops_log: { en: 'Operations & Logistics', ta: 'செயல்பாடுகள் & தளவாடங்கள்', hi: 'संचालन और लॉजिस्टिक्स' },
  support: { en: 'Customer Support', ta: 'வாடிக்கையாளர் ஆதரவு', hi: 'ग्राहक सहायता' },
}

export const GuestJobsLanding: React.FC<GuestJobsLandingProps> = ({
  totalJobsCount,
  onNavigateToLogin,
  onNavigateToHome,
}) => {
  const { t, language } = useLanguage()

  return (
    <div className="space-y-4">
      {/* 1. Clean LinkedIn-style Hero Card */}
      <Card className="border-[#E0DFDC] bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center sm:text-left flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B2545] leading-snug">
              {t('guest_hero_title')}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              {t('guest_hero_subtitle')}
            </p>

            <div className="pt-2 flex items-center justify-center sm:justify-start">
              <Button
                variant="primary"
                size="md"
                onClick={onNavigateToLogin}
                className="w-full sm:w-auto font-bold px-7 py-2.5 shadow-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>{t('guest_sign_in_cta')}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Button>
            </div>
          </div>

          <div
            onClick={onNavigateToHome}
            className="shrink-0 text-center p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
            title="Return to Home"
          >
            <img
              src="/logo.png"
              alt="NAMMA OORU JOBS"
              className="h-24 w-auto object-contain mx-auto"
            />
            <p className="text-xs font-bold text-[#0B2545] mt-1.5">
              {totalJobsCount > 0 ? `${totalJobsCount} ` : ''}
              {language === 'ta' ? 'வேலைவாய்ப்புகள்' : language === 'hi' ? 'अवसर' : 'Openings'}
            </p>
          </div>
        </div>
      </Card>

      {/* 2. Popular Job Sectors */}
      <Card className="p-4 sm:p-5 border-[#E0DFDC] bg-white shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          {t('guest_explore_sectors')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(POPULAR_SECTORS_MAP).map(([key, sector]) => (
            <button
              key={key}
              onClick={onNavigateToLogin}
              className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {sector[language] || sector.en}
            </button>
          ))}
        </div>
      </Card>

      {/* 3. Simple Human-Designed Member Gate */}
      <Card className="p-6 sm:p-8 border-[#E0DFDC] bg-white shadow-xs text-center space-y-4">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-[#0B2545]">
          <Lock className="h-5 w-5 text-[#0B2545]" />
        </div>

        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-[#0B2545]">
            {t('guest_locked_heading')}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {t('guest_locked_desc')}
          </p>
        </div>

        <div className="max-w-xs mx-auto space-y-2 pt-1">
          <Button
            variant="primary"
            size="md"
            onClick={onNavigateToLogin}
            className="w-full font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap py-2.5"
          >
            <span>{t('guest_sign_in_cta')}</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Button>

          <p className="text-[11px] text-slate-500">
            {language === 'ta'
              ? 'பணியமர்த்த விரும்பும் முதலாளியா? '
              : language === 'hi'
              ? 'क्या आप नियोक्ता हैं? '
              : 'Employer looking to hire? '}
            <button
              onClick={onNavigateToLogin}
              className="font-semibold text-[#F97316] hover:underline cursor-pointer"
            >
              {language === 'ta'
                ? 'வேலைகளைப் பதிவிட உள்நுழையவும்'
                : language === 'hi'
                ? 'नौकरी पोस्ट करने के लिए साइन इन करें'
                : 'Sign in to post jobs'}
            </button>
          </p>
        </div>
      </Card>
    </div>
  )
}
