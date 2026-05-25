import type { ReactNode } from 'react'

type Variant = 'critical' | 'high' | 'medium' | 'low' | 'success' | 'pending' | 'info' | 'default'

const styles: Record<Variant, string> = {
  critical: 'bg-[#fdecec] text-[#c8252b] border border-[#f5c2c4]',
  high:     'bg-[#fdf3e3] text-[#d97706] border border-[#f3d9a4]',
  medium:   'bg-[#e7eefc] text-[#2563c9] border border-[#c4d4f3]',
  low:      'bg-[#eef0f4] text-[#5b6473] border border-[#d3d7df]',
  success:  'bg-[#e6f4ec] text-[#1f8a4c] border border-[#b6dcc4]',
  pending:  'bg-[#f0e8fb] text-[#6c3eb8]',
  info:     'bg-[#e7eefc] text-[#2563c9]',
  default:  'bg-subtle text-text-secondary',
}

interface Props { children: ReactNode; variant?: Variant; className?: string }

export function Badge({ children, variant = 'default', className = '' }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${styles[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function priorityVariant(code: string): Variant {
  return (code as Variant) || 'default'
}

export function statusVariant(code: string): Variant {
  if (code === 'new') return 'medium'
  if (code === 'progress') return 'info'
  if (code === 'pending') return 'pending'
  if (code === 'resolved') return 'success'
  if (code === 'closed') return 'default'
  return 'default'
}
