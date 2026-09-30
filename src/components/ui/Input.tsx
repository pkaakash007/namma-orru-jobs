import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
  error?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-xs font-semibold text-[#475569]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="pointer-events-none absolute left-3 text-[#64748B]">{icon}</div>
        )}
        <input
          id={inputId}
          className={`w-full rounded-md border border-[#CDCBC7] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder-[#94A3B8] transition-colors focus:border-[#0B2545] focus:outline-none focus:ring-1 focus:ring-[#0B2545] ${
            icon ? 'pl-9' : ''
          } ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
