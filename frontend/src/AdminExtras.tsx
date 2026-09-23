import { useEffect, useState } from 'react'
import { Check, ExternalLink, FileText, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { ConfirmDialog, StatusBadge, fmtDate, type ToastType } from './AdminPortal'
import {
  deleteAdmissionApplication,
  fetchAdmissionApplications,
  fetchSiteSettings,
  updateAdmissionApplicationStatus,
  upsertSiteSetting,
  useAdminData,
  type AdmissionApplication,
  type AdmissionDocument,
} from './lib/adminHooks'
import { createPrivateFileUrl, getPublicFileUrl } from './lib/storage'
import { getErrorMessage } from './lib/supabase'
import FileUploader from './components/FileUploader'
import {
  ABOUT_DEFAULTS,
  ADMISSIONS_DEFAULTS,
  BRAND_DEFAULTS,
  CONTACT_DEFAULTS,
  CONTENT_AREAS,
  ENROLL_DEFAULTS,
  FAQ_DEFAULTS,
  FOOTER_DEFAULTS,
  HOME_DEFAULTS,
  HOMECARE_DEFAULTS,
  PARTNERS_DEFAULTS,
  clearSiteContentCache,
  mergeContent,
  resetSiteContent,
} from './lib/siteContent'

type Toast = (m: string, t?: ToastType) => void

// ── Shared helpers ──────────────────────────────────────────────────────────

const ADMISSION_STATUSES: Array<{ value: AdmissionApplication['status']; label: string }> = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ADDITIONAL_INFO_REQUIRED', label: 'Additional Information Required' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
]

export function admissionStatusLabel(status: string): string {
  return ADMISSION_STATUSES.find(s => s.value === status)?.label ?? status.replaceAll('_', ' ')
}

function formatBytes(bytes?: number) {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

async function openStoredDocument(doc: AdmissionDocument, toast: Toast) {
  if (!doc.path) {
    toast('This document has no stored file path.', 'error')
    return
  }
  try {
    const url = await createPrivateFileUrl('admission-files', doc.path)
    window.open(url, '_blank', 'noopener')
  } catch (err: unknown) {
    toast(getErrorMessage(err, 'Could not open the document.'), 'error')
  }
}

// ── Applications management ─────────────────────────────────────────────────

export function AdminApplications({ toast, initialQuery = '' }: { toast: Toast; initialQuery?: string }) {
  const { data, loading, error, reload } = useAdminData(fetchAdmissionApplications)
  const [q, setQ] = useState(initialQuery)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [programmeFilter, setProgrammeFilter] = useState('ALL')
  const [managing, setManaging] = useState<AdmissionApplication | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  useEffect(() => { if (initialQuery) setQ(initialQuery) }, [initialQuery])

  const programmes = Array.from(new Set(data.map(a => a.first_choice_title).filter((t): t is string => Boolean(t)))).sort()

  const filtered = data.filter(a => {
    const haystack = `${a.full_name} ${a.email} ${a.reference} ${a.first_choice_title ?? ''}`.toLowerCase()
    if (q && !haystack.includes(q.toLowerCase())) return false
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false
    if (programmeFilter !== 'ALL' && a.first_choice_title !== programmeFilter) return false
    return true
  })

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Applications</h1><p>Review, decide and track admission applications</p></div>
        <span style={{ color: '#3a6070', fontSize: 12 }}>{data.length} total · {filtered.length} shown</span>
      </div>

      <div className="admin-card">
        <div className="admin-card-header" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div className="admin-filter-search"><Search size={14} /><input placeholder="Search by name, email or reference…" value={q} onChange={e => setQ(e.target.value)} /></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#e0eef2', fontSize: 13, padding: '8px 10px' }}>
            <option value="ALL">All statuses</option>
            {ADMISSION_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={programmeFilter} onChange={e => setProgrammeFilter(e.target.value)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#e0eef2', fontSize: 13, padding: '8px 10px' }}>
            <option value="ALL">All programmes</option>
            {programmes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : error ? (
          <div className="admin-empty"><p>{error}</p><p style={{ marginTop: 6, fontSize: 12 }}>If the table is missing, run backend/admin_upgrade.sql in the Supabase SQL Editor.</p></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Reference</th><th>Applicant</th><th>Programme</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={6}><div className="admin-empty"><p>No applications found.</p></div></td></tr>
                  : filtered.map(a => (
                    <tr key={a.id}>
                      <td><code style={{ color: '#14b8c5', fontSize: 12 }}>{a.reference}</code></td>
                      <td><strong>{a.full_name}</strong><br /><span style={{ color: '#5a7a86', fontSize: 11 }}>{a.email}</span></td>
                      <td>{a.first_choice_title ?? '—'}{a.second_choice_title ? <><br /><span style={{ color: '#5a7a86', fontSize: 11 }}>2nd: {a.second_choice_title}</span></> : null}</td>
                      <td>{fmtDate(a.submitted_at)}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>
                        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setManaging(a)}><Pencil size={12} /> Review</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {managing && (
        <ApplicationModal
          application={managing}
          toast={toast}
          onClose={() => setManaging(null)}
          onSaved={() => { setManaging(null); reload() }}
          onDelete={() => setConfirm({
            msg: `Delete application ${managing.reference} submitted by ${managing.full_name}? This permanently removes the applicant's submitted information and cannot be undone. Uploaded document files are kept in storage but will no longer be linked to any application.`,
            fn: async () => {
              try {
                await deleteAdmissionApplication(managing)
                toast('Application deleted')
                setManaging(null)
                reload()
              } catch (err: unknown) { console.error('[admin] application delete failed:', err); toast(getErrorMessage(err, 'Delete failed'), 'error') }
              setConfirm(null)
            },
          })}
        />
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

function ApplicationModal({ application, toast, onClose, onSaved, onDelete }: {
  application: AdmissionApplication
  toast: Toast
  onClose: () => void
  onSaved: () => void
  onDelete: () => void
}) {
  const [status, setStatus] = useState<AdmissionApplication['status']>(application.status)
  const [note, setNote] = useState(application.status_note ?? '')
  const [saving, setSaving] = useState(false)

  const rows: Array<[string, string | null]> = [
    ['Email', application.email],
    ['Phone', application.phone],
    ['Date of birth', application.date_of_birth],
    ['Sex', application.sex],
    ['Nationality', application.nationality],
    ['Residence', application.residence],
    ['Address', application.address],
    ['Education level', application.education_level],
    ['Institution', application.institution],
    ['Graduation year', application.graduation_year],
    ['Languages', application.languages],
  ]

  async function save() {
    setSaving(true)
    try {
      await updateAdmissionApplicationStatus(application, status, note.trim())
      toast(`Status updated to ${admissionStatusLabel(status)}`)
      onSaved()
    } catch (err: unknown) {
      console.error('[admin] application status save failed:', err)
      toast(getErrorMessage(err, 'Save failed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal admin-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>{application.full_name} · <code style={{ color: '#14b8c5', fontSize: 13 }}>{application.reference}</code></h2>
          <button className="admin-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="admin-modal-body">
          <h3 style={{ color: '#8aaab4', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>Applicant information</h3>
          <div className="admin-form-grid">
            {rows.map(([label, value]) => (
              <div className="admin-field" key={label}>
                <label>{label}</label>
                <span style={{ color: '#e0eef2', fontSize: 13 }}>{value || '—'}</span>
              </div>
            ))}
          </div>

          <h3 style={{ color: '#8aaab4', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '22px 0 10px' }}>Programme selection</h3>
          <div className="admin-form-grid">
            <div className="admin-field"><label>First choice</label><span style={{ color: '#e0eef2', fontSize: 13 }}>{application.first_choice_title ?? '—'}</span></div>
            <div className="admin-field"><label>Second choice</label><span style={{ color: '#e0eef2', fontSize: 13 }}>{application.second_choice_title ?? '—'}</span></div>
          </div>

          {application.personal_statement && (
            <>
              <h3 style={{ color: '#8aaab4', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '22px 0 10px' }}>Personal statement</h3>
              <p style={{ color: '#b0c8d0', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{application.personal_statement}</p>
            </>
          )}

          <h3 style={{ color: '#8aaab4', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '22px 0 10px' }}>Uploaded documents</h3>
          {application.documents.length === 0 ? (
            <p style={{ color: '#5a7a86', fontSize: 13 }}>No documents were uploaded with this application.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {application.documents.map(doc => (
                <div key={doc.path ?? doc.name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '9px 12px' }}>
                  <FileText size={15} />
                  <span style={{ flex: 1, color: '#e0eef2', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.name}>{doc.name ?? 'Document'}</span>
                  <span style={{ color: '#5a7a86', fontSize: 11 }}>{formatBytes(doc.size)}</span>
                  <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => openStoredDocument(doc, toast)}><ExternalLink size={12} /> Open</button>
                </div>
              ))}
            </div>
          )}

          <h3 style={{ color: '#8aaab4', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '22px 0 10px' }}>Decision</h3>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label>Application status</label>
              <select value={status} onChange={e => setStatus(e.target.value as AdmissionApplication['status'])}>
                {ADMISSION_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="admin-field admin-field-full">
              <label>Message to the applicant (shown with the status)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note, e.g. “Please send a scanned copy of your A2 certificate.”" />
            </div>
          </div>
          <p style={{ color: '#5a7a86', fontSize: 12, margin: '10px 0 0' }}>
            The applicant sees the new status immediately on the Application Status page{application.user_id ? ' and receives an in-app notification' : ''}.
          </p>
        </div>
        <div className="admin-modal-footer" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="admin-btn admin-btn-danger" onClick={onDelete}><Trash2 size={13} /> Delete application</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save decision'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Uploaded documents overview ─────────────────────────────────────────────

export function AdminDocuments({ toast }: { toast: Toast }) {
  const { data, loading, error } = useAdminData(fetchAdmissionApplications)
  const [q, setQ] = useState('')

  const documents = data.flatMap(application =>
    (application.documents ?? []).map((doc, index) => ({
      key: `${application.id}-${index}`,
      application,
      doc,
    }))
  )

  const filtered = documents.filter(({ application, doc }) =>
    `${application.full_name} ${application.reference} ${doc.name ?? ''}`.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Documents</h1><p>Files uploaded with admission applications</p></div>
        <span style={{ color: '#3a6070', fontSize: 12 }}>{documents.length} files</span>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-filter-search"><Search size={14} /><input placeholder="Search by applicant, reference or file name…" value={q} onChange={e => setQ(e.target.value)} /></div>
        </div>
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : error ? (
          <div className="admin-empty"><p>{error}</p></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Applicant</th><th>Reference</th><th>Document</th><th>Size</th><th>Received</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={6}><div className="admin-empty"><p>No uploaded documents yet.</p></div></td></tr>
                  : filtered.map(({ key, application, doc }) => (
                    <tr key={key}>
                      <td><strong>{application.full_name}</strong></td>
                      <td><code style={{ color: '#14b8c5', fontSize: 12 }}>{application.reference}</code></td>
                      <td>{doc.name ?? 'Document'}</td>
                      <td>{formatBytes(doc.size)}</td>
                      <td>{fmtDate(application.submitted_at)}</td>
                      <td><button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => openStoredDocument(doc, toast)}><ExternalLink size={12} /> Open</button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shared CMS form primitives ──────────────────────────────────────────────

type Draft = Record<string, unknown>

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function Area({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="admin-field admin-field-full">
      <label>{label}</label>
      <textarea value={value} style={{ minHeight: rows * 34 }} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

/** Edits a string[] as one item per line. */
function Lines({ label, value, onChange, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string }) {
  return (
    <div className="admin-field admin-field-full">
      <label>{label}</label>
      <textarea
        value={value.join('\n')}
        style={{ minHeight: 110 }}
        onChange={e => onChange(e.target.value.split('\n').map(line => line.trim()).filter(Boolean))}
      />
      {hint && <span style={{ color: '#5a7a86', fontSize: 11 }}>{hint}</span>}
    </div>
  )
}

/** Generic editor for an array of small objects (rows). */
function Rows<T extends Draft>({ label, rows, onChange, fields, blank, addLabel }: {
  label: string
  rows: T[]
  onChange: (rows: T[]) => void
  fields: Array<{ key: keyof T & string; label: string; area?: boolean }>
  blank: T
  addLabel: string
}) {
  function update(index: number, key: string, value: string) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#5a7a86', textTransform: 'uppercase', letterSpacing: '.8px' }}>{label}</label>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => onChange([...rows, { ...blank }])}><Plus size={12} /> {addLabel}</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, index) => (
          <div key={index} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 12 }}>
            <div className="admin-form-grid">
              {fields.map(field => (
                <div className={`admin-field ${field.area ? 'admin-field-full' : ''}`} key={field.key}>
                  <label>{field.label}</label>
                  {field.area
                    ? <textarea value={String(row[field.key] ?? '')} onChange={e => update(index, field.key, e.target.value)} />
                    : <input value={String(row[field.key] ?? '')} onChange={e => update(index, field.key, e.target.value)} />}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => onChange(rows.filter((_, i) => i !== index))}><Trash2 size={11} /> Remove</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p style={{ color: '#5a7a86', fontSize: 12, margin: 0 }}>No entries yet — add one above.</p>}
      </div>
    </div>
  )
}

// ── Website content (CMS) ───────────────────────────────────────────────────

export function AdminWebsiteContent({ toast }: { toast: Toast }) {
  const { data: settings, loading, reload } = useAdminData(fetchSiteSettings)
  const [areaKey, setAreaKey] = useState(CONTENT_AREAS[0].key)
  const area = CONTENT_AREAS.find(a => a.key === areaKey) ?? CONTENT_AREAS[0]
  const stored = settings.find(s => s.key === areaKey)?.value

  const defaultsByArea: Record<string, { defaults: Record<string, unknown>; editor: (value: Record<string, unknown>, patch: (p: Record<string, unknown>) => void) => React.ReactNode }> = {
    'content.home': { defaults: HOME_DEFAULTS, editor: (v, p) => <HomeEditor value={v} patch={p} /> },
    'content.about': { defaults: ABOUT_DEFAULTS, editor: (v, p) => <AboutEditor value={v} patch={p} /> },
    'content.homecare': { defaults: HOMECARE_DEFAULTS, editor: (v, p) => <HomeCareEditor value={v} patch={p} /> },
    'content.admissions': { defaults: ADMISSIONS_DEFAULTS, editor: (v, p) => <AdmissionsEditor value={v} patch={p} /> },
    'content.enroll': { defaults: ENROLL_DEFAULTS, editor: (v, p) => <EnrollEditor value={v} patch={p} /> },
    'content.partners': { defaults: PARTNERS_DEFAULTS, editor: (v, p) => <PartnersEditor value={v} patch={p} /> },
    'content.contact': { defaults: CONTACT_DEFAULTS, editor: (v, p) => <ContactEditor value={v} patch={p} /> },
    'content.faq': { defaults: FAQ_DEFAULTS, editor: (v, p) => <FaqEditor value={v} patch={p} /> },
    'content.footer': { defaults: FOOTER_DEFAULTS, editor: (v, p) => <FooterEditor value={v} patch={p} /> },
    'brand': { defaults: BRAND_DEFAULTS, editor: (v, p) => <BrandingEditor value={v} patch={p} toast={toast} /> },
  }
  const active = defaultsByArea[area.key]

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Website Content</h1><p>Edit the words, links and images shown on the public website</p></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 250px) 1fr', gap: 16, alignItems: 'start' }} className="admin-cms-layout">
        <div className="admin-card" style={{ padding: 8 }}>
          {CONTENT_AREAS.map(item => (
            <button
              key={item.key}
              className={`admin-nav-item ${item.key === areaKey ? 'active' : ''}`}
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={() => setAreaKey(item.key)}
            >
              <span>{item.label}</span>
              {settings.some(s => s.key === item.key) && <Check size={13} style={{ marginLeft: 'auto', color: '#14b8c5' }} />}
            </button>
          ))}
          <p style={{ color: '#3a6070', fontSize: 11, padding: '10px 12px 6px', margin: 0 }}>
            A check mark means this area has custom content saved. Areas without one show their original copy.
          </p>
        </div>
        {loading ? (
          <div className="admin-card"><div className="admin-loading"><div className="admin-spinner" /></div></div>
        ) : (
          <ContentEditor key={areaKey} area={area} defaults={active.defaults} stored={stored} toast={toast} onSaved={reload} editor={active.editor} />
        )}
      </div>
    </div>
  )
}

function ContentEditor({ area, defaults, stored, toast, onSaved, editor }: {
  area: { key: string; label: string; description: string; preview: string }
  defaults: Record<string, unknown>
  stored: unknown
  toast: Toast
  onSaved: () => void
  editor: (value: Record<string, unknown>, patch: (p: Record<string, unknown>) => void) => React.ReactNode
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(() => mergeContent(defaults, stored))
  const [saving, setSaving] = useState(false)
  const [askReset, setAskReset] = useState(false)

  const patch = (p: Record<string, unknown>) => setDraft(prev => ({ ...prev, ...p }))

  async function save() {
    setSaving(true)
    try {
      await upsertSiteSetting(area.key, draft)
      clearSiteContentCache(area.key)
      toast(`${area.label} content saved`)
      onSaved()
    } catch (err: unknown) {
      console.error(`[admin] "${area.key}" content save failed:`, err)
      toast(getErrorMessage(err, 'Save failed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    setAskReset(false)
    try {
      await resetSiteContent(area.key)
      setDraft(mergeContent(defaults, null))
      toast(`${area.label} restored to the original content`)
      onSaved()
    } catch (err: unknown) {
      console.error(`[admin] "${area.key}" restore failed:`, err)
      toast(getErrorMessage(err, 'Restore failed'), 'error')
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <strong style={{ color: '#fff', fontSize: 14 }}>{area.label}</strong>
          <p style={{ color: '#5a7a86', fontSize: 12, margin: '3px 0 0' }}>{area.description}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a className="admin-btn admin-btn-ghost admin-btn-sm" href={area.preview} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Preview page</a>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setAskReset(true)}>Restore defaults</button>
          <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
      <div style={{ padding: 20 }}>
        {editor(draft, patch)}
        <p style={{ color: '#3a6070', fontSize: 11, marginTop: 18 }}>
          Saving publishes the content immediately for every visitor. “Restore defaults” removes the saved override and returns this area to its original text.
        </p>
      </div>
      {askReset && (
        <ConfirmDialog
          message={`Restore the original ${area.label} content? Your saved changes for this area will be removed.`}
          onConfirm={reset}
          onCancel={() => setAskReset(false)}
        />
      )}
    </div>
  )
}

// ── Per-area editors ────────────────────────────────────────────────────────

function HomeEditor({ value, patch }: { value: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const v = value as unknown as import('./lib/siteContent').HomeContent
  return (
    <div className="admin-form-grid">
      <Field label="Hero eyebrow" value={v.heroEyebrow} onChange={x => patch({ heroEyebrow: x })} />
      <Field label="Hero image URL" value={v.heroImage} onChange={x => patch({ heroImage: x })} />
      <Area label="Hero title" value={v.heroTitle} onChange={x => patch({ heroTitle: x })} />
      <Area label="Hero description" value={v.heroText} onChange={x => patch({ heroText: x })} />
      <Field label="Primary button label" value={v.primaryCtaLabel} onChange={x => patch({ primaryCtaLabel: x })} />
      <Field label="Primary button link" value={v.primaryCtaHref} onChange={x => patch({ primaryCtaHref: x })} />
      <Field label="Secondary button label" value={v.secondaryCtaLabel} onChange={x => patch({ secondaryCtaLabel: x })} />
      <Field label="Secondary button link" value={v.secondaryCtaHref} onChange={x => patch({ secondaryCtaHref: x })} />
      <Field label="Badge title" value={v.badgeTitle} onChange={x => patch({ badgeTitle: x })} />
      <Field label="Badge text" value={v.badgeText} onChange={x => patch({ badgeText: x })} />
    </div>
  )
}

function AboutEditor({ value, patch }: { value: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const v = value as unknown as import('./lib/siteContent').AboutContent
  return (
    <div className="admin-form-grid">
      <Field label="Eyebrow" value={v.eyebrow} onChange={x => patch({ eyebrow: x })} />
      <Field label="Page title" value={v.title} onChange={x => patch({ title: x })} />
      <Field label="Header image URL" value={v.image} onChange={x => patch({ image: x })} placeholder="https://…" />
      <Area label="Introduction" value={v.text} onChange={x => patch({ text: x })} />
      <Area label="Mission" value={v.mission} onChange={x => patch({ mission: x })} rows={2} />
      <Area label="Vision" value={v.vision} onChange={x => patch({ vision: x })} rows={2} />
      <Rows
        label="Values shown on the About page"
        rows={v.values}
        onChange={rows => patch({ values: rows })}
        fields={[{ key: 'title', label: 'Value title' }, { key: 'text', label: 'Description', area: true }]}
        blank={{ title: '', text: '' }}
        addLabel="Add value"
      />
      <Rows
        label="Leadership / team"
        rows={v.leadership}
        onChange={rows => patch({ leadership: rows })}
        fields={[{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }]}
        blank={{ name: '', role: '' }}
        addLabel="Add person"
      />
    </div>
  )
}

function HomeCareEditor({ value, patch }: { value: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const v = value as unknown as import('./lib/siteContent').HomeCareContent
  return (
    <div className="admin-form-grid">
      <Field label="Eyebrow" value={v.eyebrow} onChange={x => patch({ eyebrow: x })} />
      <Field label="Page title" value={v.title} onChange={x => patch({ title: x })} />
      <Area label="Introduction" value={v.text} onChange={x => patch({ text: x })} />
      <Lines
        label="Default services (used when no services are published in Home Care Services)"
        value={v.services}
        onChange={list => patch({ services: list })}
        hint="One service per line. Active services from Admin > Home Care Services automatically replace this list."
      />
      <Area label="Service card description" value={v.serviceNote} onChange={x => patch({ serviceNote: x })} />
      <Field label="Enquiry eyebrow" value={v.formEyebrow} onChange={x => patch({ formEyebrow: x })} />
      <Field label="Enquiry title" value={v.formTitle} onChange={x => patch({ formTitle: x })} />
      <Area label="Enquiry text" value={v.formText} onChange={x => patch({ formText: x })} />
    </div>
  )
}

function EnrollEditor({ value, patch }: { value: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const v = value as unknown as import('./lib/siteContent').EnrollContent
  return (
    <div className="admin-form-grid">
      <Field label="Welcome eyebrow" value={v.welcomeEyebrow} onChange={x => patch({ welcomeEyebrow: x })} />
      <div className="admin-field admin-field-full">
        <label>Welcome heading (shown on the Create Account page)</label>
        <input value={v.welcomeTitle} onChange={e => patch({ welcomeTitle: e.target.value })} />
      </div>
      <Area label="Welcome supporting text" value={v.welcomeText} onChange={x => patch({ welcomeText: x })} />
    </div>
  )
}

function PartnersEditor({ value, patch }: { value: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const v = value as unknown as import('./lib/siteContent').PartnersContent
  return (
    <div className="admin-form-grid">
      <Field label="Eyebrow" value={v.eyebrow} onChange={x => patch({ eyebrow: x })} />
      <Field label="Page title" value={v.title} onChange={x => patch({ title: x })} />
      <Area label="Introduction" value={v.text} onChange={x => patch({ text: x })} />
      <Lines label="Partner names (one per line)" value={v.names} onChange={x => patch({ names: x })} hint="These names appear as partner cards on the public Partnership page." />
    </div>
  )
}

function ContactEditor({ value, patch }: { value: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const v = value as unknown as import('./lib/siteContent').ContactContent
  const social = (key: keyof typeof v.socials) => (
    <Field key={key} label={String(key)} value={v.socials[key]} onChange={x => patch({ socials: { ...v.socials, [key]: x } })} />
  )
  return (
    <div className="admin-form-grid">
      <Field label="Email address" value={v.email} onChange={x => patch({ email: x })} />
      <Field label="Location" value={v.base} onChange={x => patch({ base: x })} />
      <Field label="Response time" value={v.responseNote} onChange={x => patch({ responseNote: x })} />
      <div className="admin-field admin-field-full"><label>Social links</label></div>
      {(['instagram', 'linkedin', 'whatsapp', 'facebook', 'tiktok', 'x'] as const).map(social)}
    </div>
  )
}

function FaqEditor({ value, patch }: { value: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const v = value as unknown as import('./lib/siteContent').FaqContent
  return (
    <Rows
      label="Frequently asked questions"
      rows={v.items}
      onChange={rows => patch({ items: rows })}
      fields={[{ key: 'question', label: 'Question' }, { key: 'answer', label: 'Answer', area: true }]}
      blank={{ question: '', answer: '' }}
      addLabel="Add question"
    />
  )
}

function FooterEditor({ value, patch }: { value: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const v = value as unknown as import('./lib/siteContent').FooterContent
  return (
    <div className="admin-form-grid">
      <Area label="Footer description" value={v.description} onChange={x => patch({ description: x })} />
      <Field label="Location" value={v.location} onChange={x => patch({ location: x })} />
      <Field label="Email" value={v.email} onChange={x => patch({ email: x })} />
      <Field label="Website" value={v.website} onChange={x => patch({ website: x })} />
      <Field label="Opening hours" value={v.hours} onChange={x => patch({ hours: x })} />
      <Field label="Copyright line" value={v.copyright} onChange={x => patch({ copyright: x })} />
      <Field label="Legal line" value={v.legal} onChange={x => patch({ legal: x })} />
    </div>
  )
}

function BrandingEditor({ value, patch, toast }: { value: Record<string, unknown>; patch: (p: Record<string, unknown>) => void; toast: Toast }) {
  const v = value as unknown as import('./lib/siteContent').BrandContent
  return (
    <div className="admin-form-grid single">
      <div className="admin-field admin-field-full">
        <label>Official logo</label>
        {v.logoUrl ? (
          <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src={v.logoUrl} alt="Current logo" style={{ height: 44, maxWidth: 200, objectFit: 'contain' }} />
            <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => patch({ logoUrl: '' })}><Trash2 size={12} /> Remove logo</button>
          </div>
        ) : <p style={{ color: '#5a7a86', fontSize: 12, margin: 0 }}>No logo uploaded — the website and admin portal currently show the built-in health mark. Upload the official logo below.</p>}
      </div>
      <div className="admin-field admin-field-full">
        <label>Upload logo (PNG, JPG, WebP or SVG · up to 2 MB)</label>
        <FileUploader
          bucket="gallery"
          pathPrefix="brand"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          maxBytes={2 * 1024 * 1024}
          label="Upload logo"
          value={v.logoUrl ? { path: v.logoUrl, name: 'Current logo', type: 'image', size: 0 } : null}
          onUploaded={file => {
            try {
              patch({ logoUrl: getPublicFileUrl('gallery', file.path) })
              toast('Logo uploaded — press “Save changes” to publish it')
            } catch (err: unknown) {
              toast(getErrorMessage(err, 'Could not prepare the logo URL'), 'error')
            }
          }}
        />
        <span style={{ color: '#5a7a86', fontSize: 11 }}>The logo keeps its aspect ratio everywhere it appears (header, sign-in, footer and admin portal). A wide or square transparent PNG works best.</span>
      </div>
    </div>
  )
}

function AdmissionsEditor({ value, patch }: { value: Record<string, unknown>; patch: (p: Record<string, unknown>) => void }) {
  const v = value as unknown as import('./lib/siteContent').AdmissionsContent
  const head = (text: string) => (
    <h3 style={{ color: '#8aaab4', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '20px 0 10px' }}>{text}</h3>
  )
  return (
    <div className="admin-form-grid">
      {head('Admissions overview page')}
      <Field label="Eyebrow" value={v.overview.eyebrow} onChange={x => patch({ overview: { ...v.overview, eyebrow: x } })} />
      <Area label="Title" value={v.overview.title} onChange={x => patch({ overview: { ...v.overview, title: x } })} />
      <Area label="Introduction" value={v.overview.text} onChange={x => patch({ overview: { ...v.overview, text: x } })} />

      {head('Undergraduate page')}
      <Area label="Title" value={v.undergraduate.title} onChange={x => patch({ undergraduate: { ...v.undergraduate, title: x } })} />
      <Area label="Introduction" value={v.undergraduate.text} onChange={x => patch({ undergraduate: { ...v.undergraduate, text: x } })} />

      {head('Postgraduate page')}
      <Area label="Title" value={v.postgraduate.title} onChange={x => patch({ postgraduate: { ...v.postgraduate, title: x } })} />
      <Area label="Introduction" value={v.postgraduate.text} onChange={x => patch({ postgraduate: { ...v.postgraduate, text: x } })} />

      {head('Entry requirements page')}
      <Area label="Title" value={v.entryRequirements.title} onChange={x => patch({ entryRequirements: { ...v.entryRequirements, title: x } })} />
      <Area label="Introduction" value={v.entryRequirements.text} onChange={x => patch({ entryRequirements: { ...v.entryRequirements, text: x } })} />

      {head('How to apply page')}
      <Area label="Title" value={v.howToApply.title} onChange={x => patch({ howToApply: { ...v.howToApply, title: x } })} />
      <Area label="Introduction" value={v.howToApply.text} onChange={x => patch({ howToApply: { ...v.howToApply, text: x } })} />
      <Rows
        label="Application steps"
        rows={v.howToApply.steps}
        onChange={rows => patch({ howToApply: { ...v.howToApply, steps: rows } })}
        fields={[{ key: 'title', label: 'Step title' }, { key: 'text', label: 'Step text', area: true }, { key: 'tip', label: 'Tip', area: true }]}
        blank={{ title: '', text: '', tip: '' }}
        addLabel="Add step"
      />

      {head('Important dates page')}
      <Area label="Title" value={v.importantDates.title} onChange={x => patch({ importantDates: { ...v.importantDates, title: x } })} />
      <Area label="Introduction" value={v.importantDates.text} onChange={x => patch({ importantDates: { ...v.importantDates, text: x } })} />
      <Rows
        label="Admissions cycle"
        rows={v.importantDates.items}
        onChange={rows => patch({ importantDates: { ...v.importantDates, items: rows } })}
        fields={[{ key: 'label', label: 'Label' }, { key: 'value', label: 'Value' }, { key: 'detail', label: 'Detail', area: true }]}
        blank={{ label: '', value: '', detail: '' }}
        addLabel="Add row"
      />

      {head('Admissions FAQ page')}
      <Area label="Title" value={v.faq.title} onChange={x => patch({ faq: { ...v.faq, title: x } })} />
      <Area label="Introduction" value={v.faq.text} onChange={x => patch({ faq: { ...v.faq, text: x } })} />
      <Rows
        label="Frequently asked questions"
        rows={v.faq.items}
        onChange={rows => patch({ faq: { ...v.faq, items: rows } })}
        fields={[{ key: 'question', label: 'Question' }, { key: 'answer', label: 'Answer', area: true }]}
        blank={{ question: '', answer: '' }}
        addLabel="Add question"
      />

      {head('Admissions help band')}
      <Field label="Admissions contact email" value={v.helper.email} onChange={x => patch({ helper: { email: x } })} />
    </div>
  )
}
