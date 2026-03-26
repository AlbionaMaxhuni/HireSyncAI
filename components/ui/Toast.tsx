'use client'

import { CheckCircle2, AlertCircle, X } from 'lucide-react'

export type ToastState =
  | { open: true; type: 'success' | 'error'; message: string }
  | { open: false }

export default function Toast({
  toast,
  onClose,
}: {
  toast: ToastState
  onClose: () => void
}) {
  if (!toast.open) return null

  const isSuccess = toast.type === 'success'

  return (
    <div className="fixed left-1/2 top-6 z-[100] w-[92vw] max-w-md -translate-x-1/2 animate-in fade-in slide-in-from-top-3 duration-300">
      <div
        className={[
          'flex items-start gap-3 rounded-3xl border bg-white px-5 py-4 shadow-2xl',
          isSuccess ? 'border-blue-100' : 'border-red-100',
        ].join(' ')}
      >
        <div className={isSuccess ? 'text-blue-600' : 'text-red-600'}>
          {isSuccess ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-900">
            {isSuccess ? 'Success' : 'Error'}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-600">{toast.message}</div>
        </div>

        <button
          onClick={onClose}
          className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          aria-label="Close toast"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}