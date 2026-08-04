import type { HTMLAttributes } from 'react'

export type CardVariant = 'default' | 'gold' | 'alert'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: 'md' | 'sm' | 'none'
}

const variantClasses: Record<CardVariant, string> = {
  default: 'border-edge/80 bg-card',
  gold: 'border-gold/40 bg-gradient-to-b from-gold/10 to-card',
  alert: 'border-danger/40 bg-gradient-to-b from-danger/10 to-card',
}

const paddingClasses = { md: 'p-5', sm: 'p-4', none: '' }

export function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-card-lg border shadow-card ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
