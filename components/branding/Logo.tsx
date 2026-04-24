import type { SVGProps } from 'react'

type LogoProps = {
  compact?: boolean
  size?: 'sm' | 'md'
  theme?: 'light' | 'dark'
  className?: string
}

function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
      <rect x="7" y="7" width="50" height="50" rx="18" fill="url(#hiresync-bg)" />
      <rect x="18" y="17" width="28" height="6" rx="3" fill="white" fillOpacity="0.96" />
      <rect x="18" y="29" width="18" height="6" rx="3" fill="white" fillOpacity="0.96" />
      <rect x="18" y="41" width="14" height="6" rx="3" fill="white" fillOpacity="0.82" />
      <path
        d="M39.5 40.5 44 45l9-11"
        stroke="#F8FAFC"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="hiresync-bg" x1="10" y1="10" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F172A" />
          <stop offset="0.5" stopColor="#2563EB" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function Logo({
  compact = false,
  size = 'md',
  theme = 'light',
  className = '',
}: LogoProps) {
  const markClassName = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10'
  const titleClassName = theme === 'dark' ? 'text-white' : 'text-slate-900'
  const subtitleClassName = theme === 'dark' ? 'text-slate-300' : 'text-slate-400'

  if (compact || size === 'sm') {
    return <LogoMark className={className || markClassName} />
  }

  return (
    <div className={['flex items-center gap-3', className].join(' ')}>
      <LogoMark className={`${markClassName} shrink-0`} />
      <div className="min-w-0">
        <div className={['truncate text-lg font-black tracking-tight', titleClassName].join(' ')}>
          HireSync<span className="text-blue-600">AI</span>
        </div>
        <div className={['text-[11px] font-black uppercase tracking-[0.22em]', subtitleClassName].join(' ')}>
          Hiring workspace
        </div>
      </div>
    </div>
  )
}
