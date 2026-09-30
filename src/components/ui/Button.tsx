import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'orange' | 'outline' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition-colors duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap'

  const sizeClasses = {
    sm: 'px-3 py-1 text-xs gap-1.5 rounded-full',
    md: 'px-4 py-1.5 text-sm gap-2 rounded-full',
    lg: 'px-5 py-2.5 text-base gap-2 rounded-full',
  }

  const variantClasses = {
    primary:
      'bg-[#0B2545] text-white hover:bg-[#071A31] border border-transparent shadow-sm',
    orange:
      'bg-[#F97316] text-white hover:bg-[#EA580C] border border-transparent shadow-sm',
    outline:
      'border border-[#0B2545] text-[#0B2545] hover:bg-[#0B2545]/5 bg-transparent',
    secondary:
      'bg-[#EBEBEB] text-[#475569] hover:bg-[#DFDFDF] hover:text-[#0F172A] border border-transparent',
    ghost:
      'text-[#5E5E5E] hover:bg-black/5 hover:text-[#191919] rounded-md px-2 py-1',
    danger:
      'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  }

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  )
}
