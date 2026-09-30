import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-lg border border-[#E0DFDC] bg-white text-[#191919] shadow-sm transition-all duration-150 ${
        interactive ? 'hover:shadow-md hover:border-[#CDCBC7]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
