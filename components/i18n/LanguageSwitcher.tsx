'use client'

import { Languages } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { supportedLanguages } from '@/lib/i18n/translations'

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage()

  return (
    <div
      className={[
        'inline-flex items-center gap-1 rounded-[10px] border border-slate-200 bg-white p-1 shadow-sm',
        compact ? 'scale-95' : '',
      ].join(' ')}
      aria-label="Switch language"
      data-i18n-skip
    >
      <div className="hidden px-2 text-slate-400 sm:block">
        <Languages size={15} />
      </div>
      {supportedLanguages.map((item) => {
        const active = language === item.code

        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLanguage(item.code)}
            aria-pressed={active}
            className={[
              'rounded-[8px] px-3 py-1.5 text-xs font-black transition',
              active ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
            ].join(' ')}
            title={item.label}
          >
            {item.shortLabel}
          </button>
        )
      })}
    </div>
  )
}

