import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { useLanguage } from '../../../context/LanguageContext'
import { GoogleSignInButton } from '../../ui/GoogleSignInButton'
import { ArrowLeft, Languages, ChevronDown, Check } from 'lucide-react'
import type { SupportedLanguage } from '../../../utils/i18n'

interface LoginPageProps {
  onSuccess?: () => void
  onBackToApp?: () => void
}

type AuthMethod = 'phone' | 'email'
type PhoneStep = 'phone' | 'otp'

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onBackToApp }) => {
  const {
    loginWithEmail,
    sendWhatsAppOtp,
    verifyWhatsAppOtp,
    user,
    selectedRole,
    setSelectedRole,
  } = useAuth()
  const { showToast } = useToast()
  const { t, language, setLanguage, languages } = useLanguage()

  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone')
  const [showLangMenu, setShowLangMenu] = useState(false)

  // Common Fields
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Phone OTP Fields
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null)
  const [resendTimer, setResendTimer] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Email Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Redirect to home if user is signed in
  useEffect(() => {
    if (user) {
      if (onSuccess) {
        onSuccess()
      } else {
        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }
  }, [user, onSuccess])

  // Timer countdown for OTP resend
  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendTimer])

  // Handle phone OTP submission
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      showToast(t('auth_phone_placeholder'), 'error')
      return
    }

    setIsLoading(true)
    try {
      const res = await sendWhatsAppOtp(cleanPhone)
      if (res.dev_otp) {
        setDevOtpCode(res.dev_otp)
      }
      setPhoneStep('otp')
      setResendTimer(30)
      showToast(res.message || t('auth_verify_subtitle'), 'success')
      setTimeout(() => inputRefs.current[0]?.focus(), 150)
    } catch (err: any) {
      showToast(err.message || 'Error', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = digit
    setOtpDigits(newDigits)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Handle OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const enteredCode = otpDigits.join('')
    if (enteredCode.length !== 6) {
      showToast(t('auth_enter_code'), 'error')
      return
    }

    setIsLoading(true)
    try {
      await verifyWhatsAppOtp(
        phoneNumber.replace(/\D/g, ''),
        enteredCode,
        fullName.trim() || undefined,
        selectedRole
      )
      if (onSuccess) {
        onSuccess()
      } else {
        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    } catch (err: any) {
      showToast(err.message || 'Verification failed', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Email / Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      showToast('Please fill all fields', 'error')
      return
    }

    setIsLoading(true)
    try {
      await loginWithEmail(email, fullName.trim() || undefined, selectedRole)
      if (onSuccess) {
        onSuccess()
      } else {
        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    } catch (err: any) {
      showToast(err.message || 'Sign in failed', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const currentLangOption = languages.find((l) => l.code === language) || languages[0]

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between text-slate-900 antialiased selection:bg-orange-100 selection:text-orange-900">
      {/* Minimal Top Bar with Language Switcher */}
      <header className="w-full py-4 px-4 sm:px-8">
        <div className="max-w-[420px] mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={
              onBackToApp ||
              (() => {
                window.history.pushState({}, '', '/')
                window.dispatchEvent(new PopStateEvent('popstate'))
              })
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label={language === 'ta' ? 'பின்செல்' : language === 'hi' ? 'वापस' : 'Back'}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{language === 'ta' ? 'பின்செல்' : language === 'hi' ? 'वापस' : 'Back'}</span>
          </button>

          {/* Pure Language Selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                title={t('nav_select_language')}
              >
                <Languages className="h-3.5 w-3.5 text-[#0B2545]" />
                <span>{currentLangOption.nativeName}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showLangMenu && (
                <div
                  className="absolute right-0 top-9 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 text-xs"
                  onClick={() => setShowLangMenu(false)}
                >
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setLanguage(item.code as SupportedLanguage)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition cursor-pointer ${
                        language === item.code
                          ? 'bg-[#0B2545] text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <span>{item.nativeName}</span>
                      {language === item.code && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={
                onBackToApp ||
                (() => {
                  window.history.pushState({}, '', '/')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                })
              }
              className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              {t('auth_skip')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-4 sm:py-8">
        <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100">
          {/* App Icon & Title */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs border border-slate-100 overflow-hidden">
              <img
                src="/logo-icon.png"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png'
                }}
                alt="Namma Ooru Jobs"
                className="h-10 w-10 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {phoneStep === 'otp' && authMethod === 'phone'
                ? t('auth_enter_code')
                : t('auth_sign_in')}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {phoneStep === 'otp' && authMethod === 'phone'
                ? `${t('auth_verify_subtitle')} +91 ${phoneNumber}`
                : t('auth_choose_account_type')}
            </p>
          </div>

          {/* Segmented Control for Role */}
          {phoneStep === 'phone' && (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100/90 mb-5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedRole('employee')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  selectedRole === 'employee'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t('auth_role_job_seeker')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('manager')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  selectedRole === 'manager'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t('auth_role_hr_recruiter')}
              </button>
            </div>
          )}

          {/* Quick 1-Click Google Sign-In */}
          {phoneStep === 'phone' && (
            <>
              <div className="flex justify-center">
                <GoogleSignInButton
                  onSuccess={
                    onSuccess ||
                    (() => {
                      window.history.pushState({}, '', '/')
                      window.dispatchEvent(new PopStateEvent('popstate'))
                    })
                  }
                />
              </div>

              {/* Hairline Divider */}
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <span className="relative bg-white px-2.5 text-[11px] text-slate-400">
                  {t('auth_or')}
                </span>
              </div>

              {/* Method Switch: Phone | Email */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100/80 mb-4 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setAuthMethod('phone')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    authMethod === 'phone'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('auth_method_phone')}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    authMethod === 'email'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('auth_method_email')}
                </button>
              </div>
            </>
          )}

          {/* Phone Method Flow */}
          {authMethod === 'phone' && (
            <>
              {phoneStep === 'phone' ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('auth_full_name_label')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('auth_full_name_placeholder')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('auth_phone_label')}
                    </label>
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden focus-within:bg-white focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-slate-900/5 transition">
                      <span className="flex items-center px-3.5 text-sm font-semibold text-slate-600 border-r border-slate-200 select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder={t('auth_phone_placeholder')}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        required
                        className="w-full bg-transparent px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {t('auth_phone_hint')}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || phoneNumber.length !== 10}
                    className="w-full mt-2 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold transition flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    {isLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      t('auth_send_code')
                    )}
                  </button>
                </form>
              ) : (
                /* OTP Verification */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-900">+91 {phoneNumber}</span>
                    <button
                      type="button"
                      onClick={() => setPhoneStep('phone')}
                      className="font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      {t('auth_change_phone')}
                    </button>
                  </div>

                  {devOtpCode && (
                    <div
                      onClick={() => {
                        const chars = devOtpCode.split('')
                        setOtpDigits(chars)
                        inputRefs.current[5]?.focus()
                      }}
                      className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/80 text-center cursor-pointer hover:bg-amber-100/80 transition"
                      title="Click to fill"
                    >
                      <p className="text-xs font-medium text-amber-900">
                        {t('auth_otp_dev_notice')} <span className="font-mono font-bold tracking-wider">{devOtpCode}</span>
                      </p>
                    </div>
                  )}

                  <div className="py-2">
                    <div className="flex justify-center gap-2 sm:gap-2.5">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            inputRefs.current[idx] = el
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="h-12 w-11 sm:w-12 text-center text-lg font-bold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join('').length !== 6}
                    className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold transition flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    {isLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      t('auth_verify_continue')
                    )}
                  </button>

                  <div className="text-center pt-1 text-xs">
                    {resendTimer > 0 ? (
                      <span className="text-slate-400">
                        {t('auth_resend_in')} {resendTimer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        className="font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
                      >
                        {t('auth_resend_code')}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}

          {/* Email Method Flow */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth_full_name_label')}
                </label>
                <input
                  type="text"
                  placeholder={t('auth_full_name_placeholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth_email_label')}
                </label>
                <input
                  type="email"
                  placeholder={t('auth_email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth_password_label')}
                </label>
                <input
                  type="password"
                  placeholder={t('auth_password_placeholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold transition flex items-center justify-center cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  t('auth_sign_in_email')
                )}
              </button>
            </form>
          )}

          {/* Terms notice */}
          <p className="mt-6 text-center text-[11px] text-slate-400 leading-normal">
            {t('auth_terms_prefix')}{' '}
            <a href="#" className="text-slate-600 hover:underline">{t('auth_terms_link')}</a>
            {' '}&{' '}
            <a href="#" className="text-slate-600 hover:underline">{t('auth_privacy_link')}</a>.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400">
        Namma Ooru Jobs
      </footer>
    </div>
  )
}
