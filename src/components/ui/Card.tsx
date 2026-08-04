import type { HTMLAttributes } from 'react'

export type CardVariant = 'default' | 'gold' | 'alert'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: 'md' | 'sm' | 'none'
}

const variantClasses: Record<CardVariant, string> = {
  default: 'border-edge/80 bg-card shadow-card hover:border-edge-strong hover:bg-surface-3',
  gold: 'border-gold/30 bg-gradient-to-b from-gold/10 to-card shadow-card-gold hover:border-gold/50',
  alert: 'border-danger/30 bg-gradient-to-b from-danger/10 to-card shadow-card-rose hover:border-danger/50',
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
      className={`min-w-0 rounded-card-lg border transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-[2px] hover:shadow-raised motion-reduce:transform-none motion-reduce:transition-none ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
