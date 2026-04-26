import type { ReactNode } from 'react'

export default function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-[14px] border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}
