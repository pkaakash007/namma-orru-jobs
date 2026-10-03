import React, { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'
import { GOOGLE_WEB_CLIENT_ID } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import type { SelectableRole } from '../../types'

declare global {
  interface Window {
    google?: any
    handleGoogleCredential?: (response: { credential?: string }) => void
  }
}

interface GoogleSignInButtonProps {
  onSuccess?: () => void
  roleOverride?: SelectableRole
  onBeforeSignIn?: () => boolean
  disabled?: boolean
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  roleOverride,
  onBeforeSignIn,
  disabled,
}) => {
  const { loginWithGoogle, user, selectedRole } = useAuth()
  const { showToast } = useToast()
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [gsiReady, setGsiReady] = useState(false)
  const initializedRef = useRef(false)
  const isNative = Capacitor.isNativePlatform()

  // Track latest role in a ref so Google Identity Services callback never has a stale role closure
  const roleRef = useRef<SelectableRole>(roleOverride || selectedRole)
  useEffect(() => {
    roleRef.current = roleOverride || selectedRole
  }, [roleOverride, selectedRole])

  // Common redirect / state completion logic
  const handleAuthSuccess = () => {
    if (onSuccess) {
      onSuccess()
    } else {
      window.dispatchEvent(new CustomEvent('namma:navigate', { detail: { path: '/' } }))
      try {
        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      } catch {}
    }
  }

  // Web GSI credential handler
  const handleCredential = async (response: { credential?: string }) => {
    if (!response?.credential) {
      showToast('Google Sign-In did not return a credential', 'error')
      return
    }
    setIsAuthenticating(true)
    try {
      let googlePicture: string | undefined
      try {
        const base64Url = response.credential.split('.')[1]
        if (base64Url) {
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
          const json = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
          googlePicture = JSON.parse(json)?.picture
        }
      } catch {}

      // Always resolve the active selected role dynamically (ref -> prop -> state -> localStorage)
      const targetRole: SelectableRole =
        roleRef.current ||
        roleOverride ||
        selectedRole ||
        (typeof window !== 'undefined' ? (localStorage.getItem('namma_selected_role') as SelectableRole) : null) ||
        'employee'

      await loginWithGoogle(response.credential, googlePicture, targetRole)
      handleAuthSuccess()
    } catch {
      // Error toast handled by AuthContext
    } finally {
      setIsAuthenticating(false)
    }
  }

  // Ref to always call latest handler from Google Identity Services callback
  const handleCredentialRef = useRef(handleCredential)
  useEffect(() => {
    handleCredentialRef.current = handleCredential
  })

  useEffect(() => {
    if (isNative) {
      // On native Android / iOS, initialize the native Google Sign-In SDK
      GoogleSignIn.initialize({
        clientId: GOOGLE_WEB_CLIENT_ID,
      }).catch((err) => {
        console.warn('Native GoogleSignIn init warning:', err)
      })
      setGsiReady(true)
      return
    }

    // On Web, use Google Identity Services (GSI) script
    window.handleGoogleCredential = (response: any) => {
      if (handleCredentialRef.current) {
        handleCredentialRef.current(response)
      }
    }

    const initGSI = () => {
      if (!window.google?.accounts?.id) return
      initializedRef.current = true

      window.google.accounts.id.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID,
        callback: (response: any) => {
          if (handleCredentialRef.current) {
            handleCredentialRef.current(response)
          }
        },
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
      })

      setGsiReady(true)
    }

    if (window.google?.accounts?.id) {
      initGSI()
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGSI()
          clearInterval(timer)
        }
      }, 300)
      return () => clearInterval(timer)
    }
  }, [isNative])

  // Re-initialize GSI if role changes so Google internal state is also refreshed
  useEffect(() => {
    if (!isNative && window.google?.accounts?.id && initializedRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          callback: (response: any) => {
            if (handleCredentialRef.current) {
              handleCredentialRef.current(response)
            }
          },
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
        })
      } catch {}
    }
  }, [roleOverride, selectedRole, isNative])

  const handleButtonClick = async () => {
    if (disabled || isAuthenticating) return
    if (onBeforeSignIn && !onBeforeSignIn()) {
      return
    }

    // ── 1. Native Android / iOS Flow ─────────────────────────
    if (isNative) {
      setIsAuthenticating(true)
      try {
        await GoogleSignIn.initialize({
          clientId: GOOGLE_WEB_CLIENT_ID,
        })
        const result = await GoogleSignIn.signIn()
        if (result?.idToken) {
          const picture = result.imageUrl || undefined
          const activeRole: SelectableRole =
            roleRef.current ||
            roleOverride ||
            selectedRole ||
            (typeof window !== 'undefined' ? (localStorage.getItem('namma_selected_role') as SelectableRole) : null) ||
            'employee'
          await loginWithGoogle(result.idToken, picture, activeRole)
          handleAuthSuccess()
        } else {
          showToast('Google Sign-In did not return an ID token', 'error')
        }
      } catch (err: any) {
        const errorMsg = err?.message || String(err)
        // Check for cancellation
        if (
          errorMsg.toLowerCase().includes('canceled') ||
          errorMsg.toLowerCase().includes('cancelled') ||
          err?.code === 'SIGN_IN_CANCELED' ||
          errorMsg.includes('16')
        ) {
          // User closed the account chooser, do not toast error
        } else if (errorMsg.includes('UNREGISTERED_ON_API_CONSOLE') || errorMsg.includes('10')) {
          showToast('Google Sign-In: App certificate needs SHA-1 added to Google Cloud Console', 'error')
        } else {
          showToast('Google Sign-In failed: ' + errorMsg, 'error')
        }
      } finally {
        setIsAuthenticating(false)
      }
      return
    }

    // ── 2. Web Browser Flow ──────────────────────────────────
    if (!gsiReady || !window.google?.accounts?.id) {
      showToast('Google Sign-In is loading, please try again', 'error')
      return
    }

    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        const tempDiv = document.createElement('div')
        tempDiv.style.display = 'none'
        document.body.appendChild(tempDiv)
        window.google.accounts.id.renderButton(tempDiv, {
          theme: 'filled_blue',
          size: 'large',
          type: 'standard',
          ux_mode: 'popup',
        })
        const btn = tempDiv.querySelector('div[role="button"]') as HTMLElement
        if (btn) btn.click()
        setTimeout(() => {
          if (document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv)
          }
        }, 3000)
      }
    })
  }

  if (user) return null

  return (
    <div className="flex flex-col items-center gap-2">
      {isAuthenticating && (
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0B2545]">
          <div className="h-4 w-4 rounded-full border-2 border-[#0B2545] border-t-transparent animate-spin" />
          <span>Signing in with Google...</span>
        </div>
      )}

      {/* Clean Apple iOS-styled button with Google SVG icon */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isAuthenticating || (!isNative && !gsiReady)}
        className="flex items-center gap-2.5 rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        <span>{isAuthenticating ? 'Signing in...' : 'Sign in with Google'}</span>
      </button>
    </div>
  )
}
