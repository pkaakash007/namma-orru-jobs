import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User, UserRole, SelectableRole } from '../types'
import { authService, userService, apiClient } from '../services/api'
import { syncDeviceTokenWithUser } from '../services/notifications'
import { useToast } from './ToastContext'

interface AuthContextType {
  user: User | null
  token: string | null
  role: UserRole
  selectedRole: SelectableRole
  setSelectedRole: (r: SelectableRole) => void
  isLoading: boolean
  hasRole: (allowed: UserRole[]) => boolean
  loginWithEmail: (email: string, fullName?: string, roleOverride?: SelectableRole) => Promise<User>
  loginWithGoogle: (idToken: string, picture?: string, roleOverride?: SelectableRole) => Promise<User>
  sendWhatsAppOtp: (
    phone: string,
    fullName?: string,
    roleOverride?: SelectableRole
  ) => Promise<{ success: boolean; message: string; dev_otp?: string }>
  verifyWhatsAppOtp: (phone: string, otp: string, fullName?: string, roleOverride?: SelectableRole) => Promise<User>
  updateUserProfile: (profileData: Partial<User>) => Promise<User>
  refreshUser: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRole, setSelectedRoleState] = useState<SelectableRole>(() => {
    try {
      const saved = localStorage.getItem('namma_selected_role')
      if (saved === 'manager' || saved === 'employee') return saved
    } catch {}
    return 'employee'
  })
  const { showToast } = useToast()

  const setSelectedRole = useCallback((newRole: SelectableRole) => {
    setSelectedRoleState(newRole)
    try {
      localStorage.setItem('namma_selected_role', newRole)
    } catch {}
  }, [])

  const role: UserRole = user?.role || 'employee'

  const hasRole = useCallback(
    (allowed: UserRole[]): boolean => {
      if (!user) return false
      return allowed.includes(user.role)
    },
    [user]
  )

  const loginWithEmail = useCallback(
    async (email: string, fullName?: string, roleOverride?: SelectableRole) => {
      setIsLoading(true)
      const roleToUse = roleOverride || selectedRole
      try {
        const data = await authService.devLogin(
          email.trim(),
          roleToUse,
          fullName || email.split('@')[0]
        )
        apiClient.setToken(data.token)
        setToken(data.token)
        setUser(data.user)
        try {
          localStorage.setItem('namma_user', JSON.stringify(data.user))
          localStorage.setItem('namma_token', data.token)
        } catch {}
        syncDeviceTokenWithUser(data.user.id, data.token)
        showToast(`Welcome, ${data.user.full_name}! (${data.user.role === 'manager' ? 'HR Recruiter' : 'Job Seeker'})`, 'success')

        // Ensure user is redirected from login page to home
        if (typeof window !== 'undefined') {
          try {
            window.history.pushState({}, '', '/')
            window.dispatchEvent(new PopStateEvent('popstate'))
          } catch {}
        }
        return data.user
      } catch (err: any) {
        showToast(err.message || 'Login failed', 'error')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [selectedRole, showToast]
  )

  const loginWithGoogle = useCallback(
    async (idToken: string, picture?: string, roleOverride?: SelectableRole) => {
      setIsLoading(true)
      const roleToUse = roleOverride || selectedRole
      try {
        const data = await authService.googleAuth(idToken, picture, roleToUse)
        const userObj: User = {
          ...data.user,
          avatar_url: data.user.avatar_url || picture || '',
        }
        apiClient.setToken(data.token)
        setToken(data.token)
        setUser(userObj)
        try {
          localStorage.setItem('namma_user', JSON.stringify(userObj))
          localStorage.setItem('namma_token', data.token)
        } catch {}
        syncDeviceTokenWithUser(userObj.id, data.token)
        showToast(`Welcome back, ${userObj.full_name}! (${userObj.role === 'manager' ? 'HR Recruiter' : userObj.role === 'admin' ? 'Admin' : 'Job Seeker'})`, 'success')

        // Ensure user is redirected from login page to home
        if (typeof window !== 'undefined') {
          try {
            window.history.pushState({}, '', '/')
            window.dispatchEvent(new PopStateEvent('popstate'))
          } catch {}
        }
        return userObj
      } catch (err: any) {
        showToast('Google Sign-In failed: ' + err.message, 'error')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [selectedRole, showToast]
  )

  const sendWhatsAppOtp = useCallback(
    async (phone: string, fullName?: string, roleOverride?: SelectableRole) => {
      setIsLoading(true)
      const roleToUse = roleOverride || selectedRole
      try {
        const res = await authService.sendWhatsAppOtp(phone, fullName, roleToUse)
        showToast(res.message || 'Verification code sent to your phone!', 'success')
        return res
      } catch (err: any) {
        showToast(err.message || 'Failed to send verification code', 'error')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [selectedRole, showToast]
  )

  const verifyWhatsAppOtp = useCallback(
    async (phone: string, otp: string, fullName?: string, roleOverride?: SelectableRole) => {
      setIsLoading(true)
      const roleToUse = roleOverride || selectedRole
      try {
        const data = await authService.verifyWhatsAppOtp(phone, otp, fullName, roleToUse)
        apiClient.setToken(data.token)
        setToken(data.token)
        setUser(data.user)
        try {
          localStorage.setItem('namma_user', JSON.stringify(data.user))
          localStorage.setItem('namma_token', data.token)
        } catch {}
        syncDeviceTokenWithUser(data.user.id, data.token)
        showToast(`Welcome, ${data.user.full_name}! (${data.user.role === 'manager' ? 'HR Recruiter' : data.user.role === 'admin' ? 'Admin' : 'Job Seeker'})`, 'success')

        // Redirect to home page
        if (typeof window !== 'undefined') {
          try {
            window.history.pushState({}, '', '/')
            window.dispatchEvent(new PopStateEvent('popstate'))
          } catch {}
        }
        return data.user
      } catch (err: any) {
        showToast(err.message || 'OTP verification failed', 'error')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [showToast]
  )

  const updateUserProfile = useCallback(
    async (profileData: Partial<User>) => {
      try {
        const res = await userService.updateProfile(profileData)
        if (res?.user) {
          setUser(res.user)
          try {
            localStorage.setItem('namma_user', JSON.stringify(res.user))
          } catch {}
          return res.user
        }
        throw new Error(res?.message || 'Failed to update profile')
      } catch (err: any) {
        showToast(err.message || 'Profile update failed', 'error')
        throw err
      }
    },
    [showToast]
  )

  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.getMe()
      if (res?.user) {
        setUser(res.user)
        try {
          localStorage.setItem('namma_user', JSON.stringify(res.user))
        } catch {}
      }
    } catch {}
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('namma_user')
      localStorage.removeItem('namma_token')
    } catch {}
    apiClient.setToken(null)
    setToken(null)
    setUser(null)
    showToast('Signed out successfully', 'info')
  }, [showToast])

  // Restore authenticated session from localStorage if present
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('namma_user')
      const savedToken = localStorage.getItem('namma_token')
      if (savedUser && savedToken) {
        const parsed = JSON.parse(savedUser)
        // Clean out legacy demo/mock data so user is not stuck with static mock profile
        if (
          parsed.email === 'karthik.jobseeker@nammaooru.com' ||
          parsed.email === 'hr.recruiter@freshworks.com' ||
          parsed.full_name === 'Karthik Raja' ||
          parsed.full_name === 'Priya Sharma (HR)'
        ) {
          localStorage.removeItem('namma_user')
          localStorage.removeItem('namma_token')
          setUser(null)
          setToken(null)
          apiClient.setToken(null)
          setIsLoading(false)
          return
        }

        setUser(parsed)
        setToken(savedToken)
        apiClient.setToken(savedToken)
        syncDeviceTokenWithUser(parsed.id, savedToken)

        // Asynchronously refresh user profile from D1 to get latest avatar_url & details
        authService
          .getMe()
          .then((res) => {
            if (res?.user) {
              setUser(res.user)
              try {
                localStorage.setItem('namma_user', JSON.stringify(res.user))
              } catch {}
            }
          })
          .catch(() => {})
      }
    } catch (e) {
      console.warn('Failed to restore session', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        selectedRole,
        setSelectedRole,
        isLoading,
        hasRole,
        loginWithEmail,
        loginWithGoogle,
        sendWhatsAppOtp,
        verifyWhatsAppOtp,
        updateUserProfile,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
