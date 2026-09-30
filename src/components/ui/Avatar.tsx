import React, { useState } from 'react'

export interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, { container: string; text: string }> = {
  xs: { container: 'h-6 w-6', text: 'text-[10px]' },
  sm: { container: 'h-8 w-8', text: 'text-xs' },
  md: { container: 'h-10 w-10', text: 'text-sm' },
  lg: { container: 'h-12 w-12', text: 'text-base' },
  xl: { container: 'h-16 w-16', text: 'text-xl' },
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false)
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || 'U'
  const { container, text } = sizeClasses[size]

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={name || 'User avatar'}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${container} rounded-full object-cover border border-black/5 shadow-xs shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      className={`${container} inline-flex items-center justify-center rounded-full bg-[#0B2545] font-bold text-white uppercase shadow-xs shrink-0 ${text} ${className}`}
    >
      {initial}
    </div>
  )
}
