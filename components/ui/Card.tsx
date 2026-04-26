import type { ReactNode } from 'react'

export default function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-[8px] border border-slate-200 bg-white ${className}`}>
      {children}
    </div>
  )
}
