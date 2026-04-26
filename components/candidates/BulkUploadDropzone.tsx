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
        for (const file of arr) fd.append('files', file)

        const res = await fetch('/api/candidates/bulk-upload', {
          method: 'POST',
          body: fd,
        })

        const json = await res.json().catch(() => null)

        if (!res.ok) {
          throw new Error(json?.error ?? 'Upload failed')
        }

        const created = Number(json?.created ?? 0)
        const processed = Number(json?.processed ?? 0)
        const queued = Number(json?.queued ?? 0)
        const errors = Array.isArray(json?.errors)
          ? json.errors.filter((item: unknown) => typeof item === 'string')
          : []
        const processingErrors = Array.isArray(json?.processingErrors)
          ? json.processingErrors.filter((item: unknown) => typeof item === 'string')
          : []

        if (created === 0) {
          setLastMsg(errors[0] || 'No candidate records were created.')
          return
        }

        const messageParts = [
          `Created: ${created} candidate(s).`,
          processed > 0 ? `Analyzed automatically: ${processed}.` : null,
          queued > 0 ? `Still queued: ${queued}.` : null,
          errors[0] ? `Skipped: ${errors[0]}` : null,
          processingErrors[0] ? `Processing issue: ${processingErrors[0]}` : null,
        ].filter(Boolean)

        setLastMsg(messageParts.join(' '))
        onUploaded?.(created)
      } catch (error: unknown) {
        setLastMsg(getErrorMessage(error))
      } finally {
        setUploading(false)
      }
    },
    [jobId, onUploaded]
  )

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setDragging(false)
      if (uploading) return
      if (event.dataTransfer.files?.length) {
        await uploadFiles(event.dataTransfer.files)
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
        onDragEnter={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setDragging(false)
        }}
        onDrop={onDrop}
        className={`rounded-[12px] border-2 border-dashed p-4 transition ${borderClass}`}
      >
        <div className="text-sm font-black text-slate-900">Bulk upload resumes</div>
        <div className="mt-1 text-xs font-semibold text-slate-500">
          Drag and drop PDF or DOCX files here. Multiple files are supported.
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-[10px] bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-600 disabled:opacity-40">
            {uploading ? 'Uploading...' : 'Choose files'}
            <input
              type="file"
              multiple
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                if (!event.target.files) return
                uploadFiles(event.target.files)
                event.currentTarget.value = ''
              }}
            />
          </label>

          <div className="text-xs font-semibold text-slate-400">PDF / DOCX / max 5 MB each</div>
        </div>

        {lastMsg ? (
          <div className="mt-3 rounded-[10px] bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
            {lastMsg}
          </div>
        ) : null}
      </div>
    </div>
  )
}
