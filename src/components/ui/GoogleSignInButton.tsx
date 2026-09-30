import React, { useEffect, useRef, useState } from 'react'
import { GOOGLE_WEB_CLIENT_ID } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

declare global {
  interface Window {
    google?: any
  }
}

import type { SelectableRole } from '../../types'

interface GoogleSignInButtonProps {
  onSuccess?: () => void
  roleOverride?: SelectableRole
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onSuccess, roleOverride }) => {
  const { loginWithGoogle, user, selectedRole } = useAuth()
  const { showToast } = useToast()
  const buttonRef = useRef<HTMLDivElement>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    // Initialize Google Identity Services for Web
    const initGoogle = () => {
      if (window.google?.accounts?.id && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          callback: async (response: { credential?: string }) => {
            if (response?.credential) {
              setIsAuthenticating(true)
              try {
                // Decode Google ID token client-side to extract profile picture immediately
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
                    const parsed = JSON.parse(json)
                    googlePicture = parsed?.picture
                  }
                } catch {}

                await loginWithGoogle(response.credential, googlePicture, roleOverride || selectedRole)
                if (onSuccess) {
                  onSuccess()
                } else {
                  window.history.pushState({}, '', '/')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }
              } catch {
                // Error toast is handled by AuthContext
              } finally {
                setIsAuthenticating(false)
              }
            } else {
              showToast('Google login did not return a credential', 'error')
            }
          },
        })

        // Clear previous buttons to avoid duplicates on re-renders
        buttonRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_black',
          size: 'medium',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
        })
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGoogle()
          clearInterval(timer)
        }
      }, 300)
      return () => clearInterval(timer)
    }
  }, [loginWithGoogle, showToast, onSuccess])

  if (user) {
    return null
  }

  return (
    <div className="flex flex-col items-center">
      {isAuthenticating && (
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#0B2545]">
          <div className="h-4 w-4 rounded-full border-2 border-[#0B2545] border-t-transparent animate-spin" />
          <span>Signing in with Google...</span>
        </div>
      )}
      <div ref={buttonRef} className="h-9 min-w-[150px]" />
    </div>
  )
}
