import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type AlertType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: AlertType
  title?: string
}

export interface AlertConfig {
  id: string
  title?: string
  message: string
  type: AlertType
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  isConfirm?: boolean
  autoDismissMs?: number
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
}

export interface ToastContextType {
  showToast: (message: string, type?: AlertType, title?: string) => void
  showAlert: (options: {
    title?: string
    message: string
    type?: AlertType
    confirmText?: string
    autoDismissMs?: number
  }) => void
  showConfirm: (options: {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    isDestructive?: boolean
    onConfirm: () => void | Promise<void>
    onCancel?: () => void
  }) => void
  dismissAlert: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAlert, setCurrentAlert] = useState<AlertConfig | null>(null)

  // Apple iOS System Alert Modal (centered on page with iOS frosted glass theme)
  const showToast = useCallback((message: string, type: AlertType = 'success', title?: string) => {
    if (!message) return
    const lower = message.toLowerCase()
    if (lower.startsWith('welcome back') || lower.startsWith('welcome,') || lower.startsWith('welcome!')) {
      return
    }

    setCurrentAlert((prev) => {
      // Do not overwrite an active user confirmation dialog with a background notification
      if (prev?.isConfirm) return prev

      const id = Math.random().toString(36).substring(2, 9)
      let finalTitle = title
      let finalMessage = message

      if (!finalTitle) {
        finalTitle =
          type === 'error'
            ? 'Error'
            : type === 'warning'
            ? 'Notice'
            : type === 'info'
            ? 'Notice'
            : 'Success'
      }

      return {
        id,
        title: finalTitle,
        message: finalMessage,
        type,
        confirmText: 'OK',
        isConfirm: false,
        autoDismissMs: 3200,
      }
    })
  }, [])

  // Explicit iOS Alert modal
  const showAlert = useCallback(
    (options: {
      title?: string
      message: string
      type?: AlertType
      confirmText?: string
      autoDismissMs?: number
    }) => {
      const id = Math.random().toString(36).substring(2, 9)
      setCurrentAlert({
        id,
        title: options.title || (options.type === 'error' ? 'Error' : 'Notice'),
        message: options.message,
        type: options.type || 'info',
        confirmText: options.confirmText || 'OK',
        isConfirm: false,
        autoDismissMs: options.autoDismissMs || 0,
      })
    },
    []
  )

  // Explicit iOS Confirmation modal (Cancel + Action)
  const showConfirm = useCallback(
    (options: {
      title?: string
      message: string
      confirmText?: string
      cancelText?: string
      isDestructive?: boolean
      onConfirm: () => void | Promise<void>
      onCancel?: () => void
    }) => {
      const id = Math.random().toString(36).substring(2, 9)
      setCurrentAlert({
        id,
        title: options.title || 'Confirm',
        message: options.message,
        type: options.isDestructive ? 'warning' : 'info',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isDestructive: options.isDestructive ?? false,
        isConfirm: true,
        autoDismissMs: 0,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
      })
    },
    []
  )

  const dismissAlert = useCallback(() => {
    setCurrentAlert(null)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!currentAlert) return
    const cb = currentAlert.onConfirm
    setCurrentAlert(null)
    if (cb) {
      await cb()
    }
  }, [currentAlert])

  const handleCancel = useCallback(() => {
    if (!currentAlert) return
    const cb = currentAlert.onCancel
    setCurrentAlert(null)
    if (cb) {
      cb()
    }
  }, [currentAlert])

  // Timer countdown for transient modal alerts
  useEffect(() => {
    if (!currentAlert || !currentAlert.autoDismissMs || currentAlert.autoDismissMs <= 0) return
    const timer = setTimeout(() => {
      setCurrentAlert((prev) => (prev?.id === currentAlert.id ? null : prev))
    }, currentAlert.autoDismissMs)
    return () => clearTimeout(timer)
  }, [currentAlert])

  // Keyboard shortcut listeners (Esc / Enter) for modal dialogs
  useEffect(() => {
    if (!currentAlert) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (currentAlert.isConfirm) {
          handleCancel()
        } else {
          dismissAlert()
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (currentAlert.isConfirm) {
          handleConfirm()
        } else {
          dismissAlert()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentAlert, handleCancel, handleConfirm, dismissAlert])

  return (
    <ToastContext.Provider value={{ showToast, showAlert, showConfirm, dismissAlert }}>
      {children}

      {/* ── Native Apple iOS UIAlertController Centered Modal ── */}
      {currentAlert && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/35 backdrop-blur-md select-none transition-opacity duration-200 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !currentAlert.isConfirm) {
              dismissAlert()
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-[275px] sm:w-[295px] max-w-[90vw] rounded-[20px] bg-[#F2F2F7]/92 backdrop-blur-2xl border border-white/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.30)] text-center overflow-hidden animate-in zoom-in-95 duration-200 ease-out select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* iOS System SF Symbol Icon */}
            <div className="pt-5 pb-2 px-5 flex justify-center">
              {currentAlert.type === 'error' ? (
                <div className="h-10 w-10 rounded-full bg-rose-500/12 text-[#FF3B30] flex items-center justify-center shadow-2xs">
                  <AlertCircle className="h-5 w-5 stroke-[2.2]" />
                </div>
              ) : currentAlert.type === 'warning' ? (
                <div className="h-10 w-10 rounded-full bg-amber-500/12 text-amber-600 flex items-center justify-center shadow-2xs">
                  <AlertTriangle className="h-5 w-5 stroke-[2.2]" />
                </div>
              ) : currentAlert.type === 'info' ? (
                <div className="h-10 w-10 rounded-full bg-blue-500/12 text-[#007AFF] flex items-center justify-center shadow-2xs">
                  <Info className="h-5 w-5 stroke-[2.2]" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-emerald-500/12 text-emerald-600 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 className="h-5 w-5 stroke-[2.2]" />
                </div>
              )}
            </div>

            {/* iOS Alert Title */}
            <h3 className="text-[17px] font-semibold text-slate-900 tracking-tight leading-snug px-5">
              {currentAlert.title}
            </h3>

            {/* iOS Alert Message Body */}
            <p className="text-[13px] text-slate-600 mt-1.5 px-5 pb-5 leading-normal font-normal break-words">
              {currentAlert.message}
            </p>

            {/* iOS Action Buttons with 1px Hairline Dividers */}
            {currentAlert.isConfirm ? (
              <div className="border-t border-slate-300/70 grid grid-cols-2 text-[17px]">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="py-3.5 font-normal text-[#007AFF] hover:bg-slate-200/40 active:bg-slate-200/70 border-r border-slate-300/70 transition cursor-pointer select-none"
                >
                  {currentAlert.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`py-3.5 font-semibold transition cursor-pointer select-none ${
                    currentAlert.isDestructive
                      ? 'text-[#FF3B30] hover:bg-rose-50/50 active:bg-rose-100/60'
                      : 'text-[#007AFF] hover:bg-slate-200/40 active:bg-slate-200/70'
                  }`}
                >
                  {currentAlert.confirmText || 'Confirm'}
                </button>
              </div>
            ) : (
              <div className="border-t border-slate-300/70">
                <button
                  type="button"
                  onClick={dismissAlert}
                  className="w-full py-3.5 text-[17px] font-semibold text-[#007AFF] hover:bg-slate-200/40 active:bg-slate-200/70 transition cursor-pointer select-none text-center"
                >
                  {currentAlert.confirmText || 'OK'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
