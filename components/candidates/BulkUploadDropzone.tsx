'use client'

import { useCallback, useMemo, useState } from 'react'

type Props = {
  jobId: string
  onUploaded?: (created: number) => void
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Upload failed'
}

function isAllowed(file: File) {
  const name = (file.name || '').toLowerCase()
  return name.endsWith('.pdf') || name.endsWith('.docx')
}

export default function BulkUploadDropzone({ jobId, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lastMsg, setLastMsg] = useState<string | null>(null)

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter(isAllowed)
      if (arr.length === 0) {
        setLastMsg('Please upload only PDF or DOCX files.')
        return
      }

      setUploading(true)
      setLastMsg(null)

      try {
        const fd = new FormData()
        fd.append('jobId', jobId)
        for (const f of arr) fd.append('files', f)

        const res = await fetch('/api/candidates/bulk-upload', {
          method: 'POST',
          body: fd,
        })

        const json = await res.json().catch(() => null)

        if (!res.ok) {
          throw new Error(json?.error ?? 'Upload failed')
        }

        const created = Number(json?.created ?? 0)
        setLastMsg(`Uploaded: ${created} candidate(s).`)
        onUploaded?.(created)
      } catch (e: unknown) {
        setLastMsg(getErrorMessage(e))
      } finally {
        setUploading(false)
      }
    },
    [jobId, onUploaded]
  )

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setDragging(false)
      if (uploading) return
      if (e.dataTransfer.files?.length) {
        await uploadFiles(e.dataTransfer.files)
      }
    },
    [uploadFiles, uploading]
  )

  const borderClass = useMemo(() => {
    if (dragging) return 'border-blue-400 bg-blue-50'
    return 'border-slate-200 bg-white'
  }, [dragging])

  return (
    <div>
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(false)
        }}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-4 transition ${borderClass}`}
      >
        <div className="text-sm font-black text-slate-900">Bulk upload resumes</div>
        <div className="mt-1 text-xs font-semibold text-slate-500">
          Drag & drop PDF/DOCX files here (multiple files supported).
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-600 disabled:opacity-40">
            {uploading ? 'Uploading…' : 'Choose files'}
            <input
              type="file"
              multiple
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                if (!e.target.files) return
                uploadFiles(e.target.files)
                e.currentTarget.value = ''
              }}
            />
          </label>

          <div className="text-xs font-semibold text-slate-400">PDF / DOCX</div>
        </div>

        {lastMsg && (
          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
            {lastMsg}
          </div>
        )}
      </div>
    </div>
  )
}
