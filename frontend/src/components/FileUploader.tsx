import { useRef, useState } from 'react'
import { CheckCircle2, FileUp, Loader2, X } from 'lucide-react'
import { uploadStoredFile, type StorageBucket, type UploadedFile } from '../lib/storage'

type FileUploaderProps = {
  bucket: StorageBucket
  pathPrefix: string
  value?: UploadedFile | null
  accept: string
  maxBytes: number
  label?: string
  onUploaded: (file: UploadedFile) => void
  onRemoved?: () => void
  disabled?: boolean
}

export default function FileUploader({ bucket, pathPrefix, value, accept, maxBytes, label = 'Choose file', onUploaded, onRemoved, disabled }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  async function upload(file?: File) {
    if (!file) return
    setError('')
    setBusy(true)
    setProgress(10)
    try {
      const uploaded = await uploadStoredFile(bucket, pathPrefix, file, { accept, maxBytes })
      setProgress(100)
      onUploaded(uploaded)
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="file-uploader">
      <div className={`file-dropzone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!disabled) upload(event.dataTransfer.files[0]) }}>
        <FileUp size={22} />
        <strong>{label}</strong>
        <small>Drag and drop or choose a file</small>
        <input ref={inputRef} type="file" accept={accept} disabled={disabled || busy} onChange={event => upload(event.target.files?.[0])} />
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>{busy ? 'Uploading…' : 'Choose File'}</button>
      </div>
      {busy && <div className="file-progress"><span style={{ width: `${progress}%` }} /><small>Uploading securely…</small></div>}
      {value && !busy && <div className="file-selected"><CheckCircle2 size={16} /><span title={value.name}>{value.name}<small>{formatBytes(value.size)} · {value.type || 'file'}</small></span>{onRemoved && <button type="button" aria-label="Remove file" onClick={onRemoved}><X size={15} /></button>}</div>}
      {error && <p className="file-error">{error}</p>}
    </div>
  )
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

export { Loader2 }
