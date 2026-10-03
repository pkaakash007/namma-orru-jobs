import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { useLanguage } from '../../../context/LanguageContext'
import { GoogleSignInButton } from '../../ui/GoogleSignInButton'
import {
  ArrowLeft,
  Languages,
  ChevronDown,
  Check,
  Building2,
  Briefcase,
  AlertCircle,
  ArrowRight,
  Smartphone,
  Mail,
  Lock,
  User as UserIcon,
  Shield,
} from 'lucide-react'
import type { SupportedLanguage } from '../../../utils/i18n'

interface LoginPageProps {
  onSuccess?: () => void
  onBackToApp?: () => void
  onOpenTerms?: () => void
  onOpenPrivacy?: () => void
}

type AuthMode = 'signin' | 'signup'
type AuthMethod = 'phone' | 'email'
type PhoneStep = 'phone' | 'otp'

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onBackToApp,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const {
    loginWithEmail,
    registerWithEmail,
    sendWhatsAppOtp,
    verifyWhatsAppOtp,
    user,
    selectedRole,
    setSelectedRole,
    lastLoginAccount,
    clearLastLogin,
  } = useAuth()
  const { showToast } = useToast()
  const { t, language, setLanguage, languages } = useLanguage()

  // Primary mode: 'signin' (existing user) or 'signup' (new user)
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone')
  const [isUsingDifferentAccount, setIsUsingDifferentAccount] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [roleConflictNotice, setRoleConflictNotice] = useState<{
    message: string
    targetRole: 'employee' | 'manager' | 'staff'
  } | null>(null)

  // Mandatory Terms of Service & Privacy Policy Acceptance (ONLY for new sign-up users)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)

  const validateTermsAccepted = (): boolean => {
    // Only required for new sign up users; old/existing sign in users never blocked
    if (authMode !== 'signup') {
      return true
    }
    if (!acceptedTerms) {
      setTermsError(true)
      showToast(t('auth_terms_required_error'), 'error')
      return false
    }
    setTermsError(false)
    return true
  }

  const renderTermsConsent = (idPrefix: string) => {
    if (authMode !== 'signup') return null
    return (
    <div
      className={`my-3 p-3 rounded-xl border transition-all ${
        termsError
          ? 'border-rose-400 bg-rose-50/70 ring-1 ring-rose-400'
          : acceptedTerms
          ? 'border-slate-300 bg-slate-50'
          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
      }`}
    >
      <label htmlFor={`${idPrefix}-terms-check`} className="flex items-start gap-2.5 cursor-pointer select-none text-left">
        <input
          id={`${idPrefix}-terms-check`}
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => {
            setAcceptedTerms(e.target.checked)
            if (e.target.checked) setTermsError(false)
          }}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#0B2545] focus:ring-1 focus:ring-[#0B2545] cursor-pointer"
        />
        <div className="flex-1 text-[11px] sm:text-xs text-slate-600 leading-snug">
          <span>{t('auth_terms_agree_prefix')}{' '}</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (onOpenTerms) {
                onOpenTerms()
              } else {
                window.location.hash = '#terms'
              }
            }}
            className="font-bold text-[#0B2545] hover:underline cursor-pointer inline-flex items-center"
          >
            {t('auth_terms_link')}
          </button>
          <span>{' '}{t('auth_terms_and')}{' '}</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (onOpenPrivacy) {
                onOpenPrivacy()
              } else {
                window.location.hash = '#privacy'
              }
            }}
            className="font-bold text-[#0B2545] hover:underline cursor-pointer inline-flex items-center"
          >
            {t('auth_privacy_link')}
          </button>
          {termsError && (
            <p className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{t('auth_terms_required_error')}</span>
            </p>
          )}
        </div>
      </label>
    </div>
    )
  }

  // Form Fields
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
  const [company, setCompany] = useState('')

  // Safe navigation helper
  const handleNavigateHome = () => {
    if (onSuccess) {
      onSuccess()
    } else {
      window.history.pushState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  // Redirect to home if user is already signed in
  useEffect(() => {
    if (user) {
      handleNavigateHome()
    }
  }, [user])

  // Timer countdown for OTP resend
  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendTimer])

  // Switch between Sign In and Sign Up modes cleanly
  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode)
    setPhoneStep('phone')
    setRoleConflictNotice(null)
    setDevOtpCode(null)
    setTermsError(false)
    if (mode === 'signup') {
      setIsUsingDifferentAccount(true)
    } else {
      setIsUsingDifferentAccount(false)
      setAcceptedTerms(false)
    }
  }

  // Handle 1-click continue with recently signed in account
  const handleContinueWithRecentAccount = async () => {
    if (!lastLoginAccount) return
    const roleToUse = lastLoginAccount.role === 'manager' ? 'manager' : 'employee'
    setSelectedRole(roleToUse)
    setRoleConflictNotice(null)

    // Direct 1-click authentication for email / Google / existing accounts
    if (lastLoginAccount.email) {
      setIsLoading(true)
      try {
        await loginWithEmail(
          lastLoginAccount.email,
          lastLoginAccount.full_name || undefined,
          roleToUse,
          lastLoginAccount.role === 'manager' && lastLoginAccount.company
            ? {
                company: lastLoginAccount.company,
                position: lastLoginAccount.position || 'HR Recruiter',
                phone: lastLoginAccount.phone || undefined,
              }
            : undefined
        )
        handleNavigateHome()
        return
      } catch (err: any) {
        const msg = err.message || 'Failed to continue with recent account'
        showToast(msg, 'error')
        setIsUsingDifferentAccount(true)
        return
      } finally {
        setIsLoading(false)
      }
    }

    if (lastLoginAccount.phone) {
      const cleanPhone = lastLoginAccount.phone.replace(/\D/g, '')
      const phoneEmail = `${cleanPhone}@phone.nammaoorujobs.com`
      setIsLoading(true)
      try {
        await loginWithEmail(
          phoneEmail,
          lastLoginAccount.full_name || undefined,
          roleToUse,
          lastLoginAccount.role === 'manager' && lastLoginAccount.company
            ? {
                company: lastLoginAccount.company,
                position: lastLoginAccount.position || 'HR Recruiter',
                phone: cleanPhone,
              }
            : { phone: cleanPhone }
        )
        handleNavigateHome()
        return
      } catch {
        // Fall back to phone OTP if direct session creation fails
        setPhoneNumber(cleanPhone)
        setAuthMethod('phone')
        if (lastLoginAccount.full_name) setFullName(lastLoginAccount.full_name)
        if (lastLoginAccount.company) setCompany(lastLoginAccount.company)

        try {
          const res = await sendWhatsAppOtp(cleanPhone, lastLoginAccount.full_name, roleToUse)
          if (res.dev_otp) {
            setDevOtpCode(res.dev_otp)
          }
          setPhoneStep('otp')
          setResendTimer(30)
          showToast(res.message || t('auth_verify_subtitle'), 'success')
          setTimeout(() => inputRefs.current[0]?.focus(), 150)
        } catch (otpErr: any) {
          showToast(otpErr.message || 'Failed to send verification code', 'error')
          setIsUsingDifferentAccount(true)
        }
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Handle phone OTP send (works for both Sign In and Sign Up)
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (authMode === 'signup' && !validateTermsAccepted()) return
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      showToast(t('auth_phone_placeholder'), 'error')
      return
    }

    if (authMode === 'signup' && !fullName.trim()) {
      showToast('Please enter your full name to create an account', 'error')
      return
    }

    if (authMode === 'signup' && selectedRole === 'manager' && !company.trim()) {
      showToast('Please enter your company / organization name', 'error')
      return
    }

    setIsLoading(true)
    setRoleConflictNotice(null)
    try {
      const nameToSend = authMode === 'signup' ? fullName.trim() : (fullName.trim() || undefined)
      const res = await sendWhatsAppOtp(cleanPhone, nameToSend, selectedRole)
      if (res.dev_otp) {
        setDevOtpCode(res.dev_otp)
      }
      setPhoneStep('otp')
      setResendTimer(30)
      showToast(res.message || t('auth_verify_subtitle'), 'success')
      setTimeout(() => inputRefs.current[0]?.focus(), 150)
    } catch (err: any) {
      const msg = err.message || 'Failed to send verification code'
      if (msg.includes('Job Seeker') || msg.includes('ROLE_CONFLICT_EMPLOYEE')) {
        setRoleConflictNotice({ message: msg, targetRole: 'employee' })
      } else if (msg.includes('HR Recruiter') || msg.includes('ROLE_CONFLICT_HR')) {
        setRoleConflictNotice({ message: msg, targetRole: 'manager' })
      } else if (msg.includes('Staff') || msg.includes('ROLE_CONFLICT_STAFF')) {
        setRoleConflictNotice({ message: msg, targetRole: 'staff' })
      }
      showToast(msg, 'error')
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

  // Handle OTP backspace navigation
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Handle OTP paste support
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      const newDigits = [...otpDigits]
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i]
      }
      setOtpDigits(newDigits)
      const focusIndex = Math.min(pasted.length, 5)
      inputRefs.current[focusIndex]?.focus()
    }
  }

  // Handle OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (authMode === 'signup' && !validateTermsAccepted()) return
    const enteredCode = otpDigits.join('')
    if (enteredCode.length !== 6) {
      showToast(t('auth_enter_code'), 'error')
      return
    }

    setIsLoading(true)
    setRoleConflictNotice(null)
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '')
      const nameToSend = authMode === 'signup' ? fullName.trim() : (fullName.trim() || undefined)
      await verifyWhatsAppOtp(cleanPhone, enteredCode, nameToSend, selectedRole)
      handleNavigateHome()
    } catch (err: any) {
      const msg = err.message || 'Verification failed'
      if (msg.includes('Job Seeker') || msg.includes('ROLE_CONFLICT_EMPLOYEE')) {
        setRoleConflictNotice({ message: msg, targetRole: 'employee' })
      } else if (msg.includes('HR Recruiter') || msg.includes('ROLE_CONFLICT_HR')) {
        setRoleConflictNotice({ message: msg, targetRole: 'manager' })
      } else if (msg.includes('Staff') || msg.includes('ROLE_CONFLICT_STAFF')) {
        setRoleConflictNotice({ message: msg, targetRole: 'staff' })
      }
      showToast(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Email Auth (Sign In vs Sign Up)
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (authMode === 'signup' && !validateTermsAccepted()) return
    if (!email.trim()) {
      showToast('Please enter your email address', 'error')
      return
    }

    if (authMode === 'signup') {
      if (!fullName.trim()) {
        showToast('Please enter your full name', 'error')
        return
      }
      if (selectedRole === 'manager' && !company.trim()) {
        showToast('Please enter your company / organization name', 'error')
        return
      }

      setIsLoading(true)
      setRoleConflictNotice(null)
      try {
        await registerWithEmail(
          email,
          fullName.trim(),
          selectedRole,
          selectedRole === 'manager'
            ? {
                company: company.trim(),
                position: 'HR Recruiter',
                phone: phoneNumber.trim() || undefined,
              }
            : undefined
        )
        handleNavigateHome()
      } catch (err: any) {
        const msg = err.message || 'Registration failed'
        if (msg.includes('already exists') || msg.includes('409')) {
          setAuthMode('signin')
        }
        if (msg.includes('Job Seeker') || msg.includes('ROLE_CONFLICT_EMPLOYEE')) {
          setRoleConflictNotice({ message: msg, targetRole: 'employee' })
        } else if (msg.includes('HR Recruiter') || msg.includes('ROLE_CONFLICT_HR')) {
          setRoleConflictNotice({ message: msg, targetRole: 'manager' })
        } else if (msg.includes('Staff') || msg.includes('ROLE_CONFLICT_STAFF')) {
          setRoleConflictNotice({ message: msg, targetRole: 'staff' })
        }
      } finally {
        setIsLoading(false)
      }
    } else {
      // Existing User Sign In
      setIsLoading(true)
      setRoleConflictNotice(null)
      try {
        await loginWithEmail(
          email,
          fullName.trim() || undefined,
          selectedRole,
          selectedRole === 'manager' && company.trim()
            ? {
                company: company.trim(),
                position: 'HR Recruiter',
                phone: phoneNumber.trim() || undefined,
              }
            : undefined
        )
        handleNavigateHome()
      } catch (err: any) {
        const msg = err.message || 'Sign in failed'
        if (msg.includes('Job Seeker') || msg.includes('ROLE_CONFLICT_EMPLOYEE')) {
          setRoleConflictNotice({ message: msg, targetRole: 'employee' })
        } else if (msg.includes('HR Recruiter') || msg.includes('ROLE_CONFLICT_HR')) {
          setRoleConflictNotice({ message: msg, targetRole: 'manager' })
        } else if (msg.includes('Staff') || msg.includes('ROLE_CONFLICT_STAFF')) {
          setRoleConflictNotice({ message: msg, targetRole: 'staff' })
        }
      } finally {
        setIsLoading(false)
      }
    }
  }

  const currentLangOption = languages.find((l) => l.code === language) || languages[0]
  const showRecentAccountCard =
    authMode === 'signin' && phoneStep === 'phone' && !!lastLoginAccount && !isUsingDifferentAccount

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col justify-between text-slate-900 antialiased">
      {/* ── Compact Top Navigation Bar ── */}
      <header className="w-full py-3 px-4 sm:px-6 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToApp || handleNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{language === 'ta' ? 'முகப்பு' : language === 'hi' ? 'होम' : 'Back to Home'}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              >
                <Languages className="h-3 w-3 text-[#0B2545]" />
                <span>{currentLangOption.nativeName}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showLangMenu && (
                <div
                  className="absolute right-0 top-9 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-50 text-xs"
                  onClick={() => setShowLangMenu(false)}
                >
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setLanguage(item.code as SupportedLanguage)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                        language === item.code
                          ? 'bg-[#0B2545] text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <span>{item.nativeName}</span>
                      {language === item.code && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Skip */}
            <button
              type="button"
              onClick={onBackToApp || handleNavigateHome}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer px-2 py-1"
            >
              <span>{t('auth_skip')}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Centered View: Compact, Sleek, Zero-Scroll ── */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-[360px] bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/90 mx-auto">
          
          {/* Header: Logo + Title + Subtitle */}
          <div className="text-center mb-4">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shadow-2xs">
              <img
                src="/logo-icon.png"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png'
                }}
                alt="Namma Ooru Jobs"
                className="h-7 w-7 object-contain"
              />
            </div>
            
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              {phoneStep === 'otp' && authMethod === 'phone'
                ? t('auth_enter_code')
                : showRecentAccountCard
                ? t('auth_last_login_title')
                : authMode === 'signin'
                ? t('auth_sign_in_title')
                : t('auth_sign_up_title')}
            </h1>
            <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 max-w-xs mx-auto leading-normal">
              {phoneStep === 'otp' && authMethod === 'phone'
                ? `Code sent to +91 ${phoneNumber}`
                : showRecentAccountCard
                ? t('auth_last_login_device')
                : authMode === 'signin'
                ? t('auth_sign_in_subtitle')
                : t('auth_sign_up_subtitle')}
            </p>
          </div>

          {/* ── Recent Account Card (Human-crafted Apple iOS Style) ── */}
          {showRecentAccountCard && lastLoginAccount ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t('auth_last_login_device')}
                  </span>
                  <button
                    type="button"
                    onClick={clearLastLogin}
                    className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition cursor-pointer px-1 py-0.5 rounded"
                    title="Remove from this device"
                  >
                    {t('auth_remove_account')}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {lastLoginAccount.avatar_url ? (
                    <img
                      src={lastLoginAccount.avatar_url}
                      alt={lastLoginAccount.full_name}
                      className="h-11 w-11 rounded-full object-cover border border-slate-200 bg-white shrink-0"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-[#0B2545] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      {lastLoginAccount.full_name ? lastLoginAccount.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {lastLoginAccount.full_name}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          lastLoginAccount.role === 'manager'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200/60'
                            : 'bg-blue-100 text-blue-900 border border-blue-200/60'
                        }`}
                      >
                        {lastLoginAccount.role === 'manager' ? t('auth_role_hr_recruiter') : t('auth_role_job_seeker')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {lastLoginAccount.phone
                        ? `+91 ${lastLoginAccount.phone}`
                        : lastLoginAccount.email || ''}
                    </p>
                    {lastLoginAccount.role === 'manager' && lastLoginAccount.company && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {lastLoginAccount.company}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleContinueWithRecentAccount}
                    className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <span>{t('auth_continue_as')} {lastLoginAccount.full_name.split(' ')[0]}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsUsingDifferentAccount(true)}
                    className="w-full py-1 text-center text-[11px] font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    {t('auth_use_another_account')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Back to Recent Account button if user switched to another account */}
              {authMode === 'signin' && phoneStep === 'phone' && lastLoginAccount && isUsingDifferentAccount && (
                <div className="mb-3 text-center">
                  <button
                    type="button"
                    onClick={() => setIsUsingDifferentAccount(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2545] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>{t('auth_back_to_recent')} ({lastLoginAccount.full_name.split(' ')[0]})</span>
                  </button>
                </div>
              )}

              {/* ── Sleek Compact Role Switcher: Job Seeker vs HR Recruiter vs Staff ── */}
              {phoneStep === 'phone' && (
            <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100 mb-3.5 text-xs font-semibold gap-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('employee')
                  setRoleConflictNotice(null)
                }}
                className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedRole === 'employee'
                    ? 'bg-white text-[#0B2545] shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t('auth_role_job_seeker')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('manager')
                  setRoleConflictNotice(null)
                }}
                className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedRole === 'manager'
                    ? 'bg-white text-[#0B2545] shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t('auth_role_hr_recruiter')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('staff')
                  setRoleConflictNotice(null)
                }}
                className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedRole === 'staff'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <Shield className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                <span className="truncate">{t('auth_role_company_staff')}</span>
              </button>
            </div>
          )}

          {/* ── Role Conflict Banner (Compact Auto-switch) ── */}
          {phoneStep === 'phone' && roleConflictNotice && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-2.5 mb-3 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <span className="font-medium text-rose-950 text-[11px] truncate">
                  {roleConflictNotice.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(roleConflictNotice.targetRole)
                  setRoleConflictNotice(null)
                }}
                className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold shrink-0 cursor-pointer"
              >
                Switch
              </button>
            </div>
          )}

          {/* ── Terms & Privacy Consent & 1-Click Google Sign-In ── */}
          {phoneStep === 'phone' && (
            <>
              {authMode === 'signup' && renderTermsConsent('main')}

              <div className="flex justify-center mb-3">
                <GoogleSignInButton
                  roleOverride={selectedRole}
                  onBeforeSignIn={authMode === 'signup' ? validateTermsAccepted : undefined}
                  onSuccess={handleNavigateHome}
                  onError={(err) => {
                    const msg = err?.message || ''
                    if (
                      msg.includes('Job Seeker') ||
                      msg.includes('ROLE_CONFLICT_EMPLOYEE') ||
                      msg.includes('Employee')
                    ) {
                      setRoleConflictNotice({
                        message: 'You are already registered as an Employee (Job Seeker). Please switch to the Job Seeker tab to sign in.',
                        targetRole: 'employee',
                      })
                    } else if (
                      msg.includes('HR Recruiter') ||
                      msg.includes('ROLE_CONFLICT_HR') ||
                      msg.includes('manager')
                    ) {
                      setRoleConflictNotice({
                        message: 'You are already registered as an HR Recruiter. Please switch to the HR Recruiter tab to sign in.',
                        targetRole: 'manager',
                      })
                    } else if (
                      msg.includes('Staff') ||
                      msg.includes('ROLE_CONFLICT_STAFF') ||
                      msg.includes('staff')
                    ) {
                      setRoleConflictNotice({
                        message: 'You are already registered as Company Staff. Please switch to the Staff Login tab to sign in.',
                        targetRole: 'staff',
                      })
                    }
                  }}
                />
              </div>

              {/* Compact Divider */}
              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80" />
                </div>
                <span className="relative bg-white px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {t('auth_or')}
                </span>
              </div>
            </>
          )}

          {/* ── Primary Auth Form: Mobile OTP ── */}
          {authMethod === 'phone' && (
            <>
              {phoneStep === 'phone' ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-3">
                  {/* Full Name: ONLY on Sign Up */}
                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t('auth_full_name_label')} *
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {/* HR Company Name: ONLY on HR Sign Up */}
                  {authMode === 'signup' && selectedRole === 'manager' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t('auth_company_name_label')} *
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {/* Phone Number Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {t('auth_phone_label')}
                    </label>
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden focus-within:bg-white focus-within:border-slate-900 transition">
                      <span className="flex items-center gap-1 px-3 text-xs font-bold text-slate-700 border-r border-slate-200 bg-slate-100/60 select-none">
                        🇮🇳 +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder={t('auth_phone_placeholder')}
                        required
                        className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || phoneNumber.length !== 10}
                    className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white text-xs sm:text-sm font-semibold transition flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    {isLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <span>{t('auth_send_code')}</span>
                    )}
                  </button>

                  {/* Switch to Email link */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMethod('email')}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                    >
                      {language === 'ta' ? 'மின்னஞ்சல் மூலம் உள்நுழைய' : language === 'hi' ? 'ईमेल से साइन इन करें' : 'Use email instead'}
                    </button>
                  </div>
                </form>
              ) : (
                /* ── OTP Verification Step ── */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-bold text-slate-900">+91 {phoneNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhoneStep('phone')}
                      className="font-semibold text-[#0B2545] hover:underline cursor-pointer text-[11px]"
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
                      className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-center cursor-pointer hover:bg-amber-100 transition"
                      title="Click to fill automatically"
                    >
                      <p className="text-[11px] font-medium text-amber-900">
                        {t('auth_otp_dev_notice')}{' '}
                        <span className="font-mono font-bold tracking-wider text-amber-950 underline">
                          {devOtpCode}
                        </span>{' '}
                        <span className="text-[10px] text-amber-700">(click to fill)</span>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-center text-[11px] font-semibold text-slate-600 mb-1.5">
                      Enter 6-digit code
                    </label>
                    <div className="flex justify-center gap-1.5 sm:gap-2">
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
                          onPaste={handleOtpPaste}
                          className="h-10 w-9 sm:w-10 text-center text-base font-bold rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join('').length !== 6}
                    className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white text-xs sm:text-sm font-semibold transition flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    {isLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <span>{t('auth_verify_continue')}</span>
                    )}
                  </button>

                  <div className="text-center text-[11px]">
                    {resendTimer > 0 ? (
                      <span className="text-slate-400 font-medium">
                        {t('auth_resend_in')} {resendTimer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        className="font-bold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
                      >
                        {t('auth_resend_code')}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}

          {/* ── Secondary Auth Form: Email ── */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {/* Full Name: ONLY on Sign Up */}
              {authMode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {t('auth_full_name_label')} *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {t('auth_email_label')} *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth_email_placeholder')}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition font-medium"
                  />
                </div>
              </div>

              {/* HR Company Name: ONLY on HR */}
              {selectedRole === 'manager' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {t('auth_company_name_label')} {authMode === 'signup' && '*'}
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      required={authMode === 'signup'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {t('auth_password_label')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth_password_placeholder')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition font-medium"
                  />
                </div>
              </div>

              {/* Terms Checkbox: ONLY on Sign Up */}
              {authMode === 'signup' && renderTermsConsent('email')}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white text-xs sm:text-sm font-semibold transition flex items-center justify-center cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span>
                    {authMode === 'signup'
                      ? t('auth_create_account_btn')
                      : t('auth_sign_in_email')}
                  </span>
                )}
              </button>

              {/* Switch to Phone link */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setAuthMethod('phone')}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                >
                  {language === 'ta' ? 'தொலைபேசி எண் மூலம் உள்நுழைய' : language === 'hi' ? 'फ़ोन नंबर से साइन इन करें' : 'Use phone OTP instead'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

          {/* ── Footer Switch Link: Sign In vs Sign Up ── */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 text-center text-xs">
            {authMode === 'signin' ? (
              <p className="text-slate-600">
                {t('auth_dont_have_account')}{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('signup')}
                  className="font-bold text-[#0B2545] hover:underline cursor-pointer"
                >
                  {t('auth_switch_to_sign_up')}
                </button>
              </p>
            ) : (
              <p className="text-slate-600">
                {t('auth_already_have_account')}{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('signin')}
                  className="font-bold text-[#0B2545] hover:underline cursor-pointer"
                >
                  {t('auth_switch_to_sign_in')}
                </button>
              </p>
            )}
          </div>

          {/* Subtle Terms Footnote */}
          <p className="mt-3 text-center text-[10px] text-slate-400 leading-normal">
            {t('auth_terms_prefix')}{' '}
            <button
              type="button"
              onClick={() => {
                if (onOpenTerms) {
                  onOpenTerms()
                } else {
                  window.location.hash = '#terms'
                }
              }}
              className="text-slate-600 font-medium hover:underline cursor-pointer hover:text-[#0B2545]"
            >
              {t('auth_terms_link')}
            </button>
            {' '}&{' '}
            <button
              type="button"
              onClick={() => {
                if (onOpenPrivacy) {
                  onOpenPrivacy()
                } else {
                  window.location.hash = '#privacy'
                }
              }}
              className="text-slate-600 font-medium hover:underline cursor-pointer hover:text-[#0B2545]"
            >
              {t('auth_privacy_link')}
            </button>
          </p>
        </div>
      </main>

      {/* ── Micro Footer ── */}
      <footer className="w-full py-2.5 text-center text-[11px] text-slate-400 font-medium">
        Namma Ooru Jobs &bull; Tamil Nadu Professional Network
      </footer>
    </div>
  )
}
