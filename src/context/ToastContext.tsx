import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

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
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [currentAlert, setCurrentAlert] = useState<AlertConfig | null>(null)

  // Non-blocking Apple iOS Toast notification (floating top pill, auto-dismisses in 3s)
  const showToast = useCallback((message: string, type: AlertType = 'success', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev.slice(-2), { id, message, type, title }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Explicit iOS Alert modal (only when explicitly requested)
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
        title: options.title || 'Notice',
        message: options.message,
        type: options.type || 'info',
        confirmText: options.confirmText || 'OK',
        isConfirm: false,
        autoDismissMs: options.autoDismissMs,
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

      {/* ── Apple iOS Non-blocking Floating Toast Capsule ── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center gap-2 pointer-events-none max-w-[92vw] sm:max-w-md w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            onClick={() => dismissToast(toast.id)}
            className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/95 text-white shadow-[0_12px_30px_-6px_rgba(0,0,0,0.4)] backdrop-blur-xl border border-white/15 text-xs sm:text-sm font-medium transition-all duration-200 animate-in slide-in-from-top-3 fade-in cursor-pointer select-none hover:scale-102 active:scale-98"
          >
            {toast.type === 'error' ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 stroke-[2.2]" />
              </span>
            ) : toast.type === 'warning' ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 stroke-[2.2]" />
              </span>
            ) : toast.type === 'info' ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
                <Info className="h-3.5 w-3.5 stroke-[2.2]" />
              </span>
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.2]" />
              </span>
            )}
            <span className="truncate max-w-[280px] sm:max-w-sm">{toast.message}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                dismissToast(toast.id)
              }}
              className="ml-1 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* ── Native Apple iOS UIAlertController Modal Component (Explicit Modals / Confirms Only) ── */}
      {currentAlert && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !currentAlert.isConfirm) {
              dismissAlert()
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-[290px] sm:w-[320px] max-w-full rounded-[22px] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-black/5 dark:border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] text-center overflow-hidden animate-in zoom-in-95 duration-200 ease-out select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* iOS System Icon */}
            <div className="pt-6 pb-2 px-5 flex justify-center">
              {currentAlert.type === 'error' ? (
                <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs">
                  <AlertCircle className="h-6 w-6 stroke-[2.2]" />
                </div>
              ) : currentAlert.type === 'warning' ? (
                <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
                  <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
                </div>
              ) : currentAlert.type === 'info' ? (
                <div className="h-12 w-12 rounded-full bg-blue-50 text-[#0B2545] flex items-center justify-center shadow-2xs">
                  <Info className="h-6 w-6 stroke-[2.2]" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 className="h-6 w-6 stroke-[2.2]" />
                </div>
              )}
            </div>

            {/* iOS Alert Title */}
            <h3 className="text-[17px] font-bold text-slate-900 tracking-tight leading-snug px-5">
              {currentAlert.title}
            </h3>

            {/* iOS Alert Message Body */}
            <p className="text-[13px] text-slate-600 mt-1.5 px-5 pb-5 leading-relaxed font-normal">
              {currentAlert.message}
            </p>

            {/* iOS Action Buttons with 1px Hairline Dividers */}
            {currentAlert.isConfirm ? (
              <div className="border-t border-slate-200/80 grid grid-cols-2 text-[16px]">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="py-3.5 font-normal text-slate-600 hover:bg-slate-100/60 active:bg-slate-200/60 border-r border-slate-200/80 transition cursor-pointer select-none"
                >
                  {currentAlert.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`py-3.5 font-semibold transition cursor-pointer select-none ${
                    currentAlert.isDestructive
                      ? 'text-rose-600 hover:bg-rose-50/50 active:bg-rose-100/50'
                      : 'text-[#0B2545] hover:bg-slate-100/60 active:bg-slate-200/60'
                  }`}
                >
                  {currentAlert.confirmText || 'Confirm'}
                </button>
              </div>
            ) : (
              <div className="border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={dismissAlert}
                  className="w-full py-3.5 text-[16px] font-semibold text-[#0B2545] hover:bg-slate-100/60 active:bg-slate-200/60 transition cursor-pointer select-none"
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
