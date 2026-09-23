import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, CircleAlert, ClipboardCheck, Clock3, Copy, FileText, Info, Search, ShieldCheck, X } from 'lucide-react'
import {
  admissionStatusLabels,
  admissionStatusMeta,
  admissionStatusTimeline,
  formatAdmissionDateTime,
  listLocalApplications,
  lookupAdmissionApplication,
  type AdmissionApplicationRecord,
  type AdmissionApplicationStatus,
  type AdmissionStatusResult,
  type TimelineStepState,
} from './admissionsApi'
import { AdmissionsHelpBand, AdmissionsHero, AdmissionsSectionHead } from './AdmissionsShared'
import './admissions.css'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const statusOrder: AdmissionApplicationStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'ACCEPTED', 'REJECTED']

const timelineStateCopy: Record<TimelineStepState, string> = {
  done: 'Completed',
  current: 'In progress',
  upcoming: 'Pending',
  attention: 'Action required from you',
  success: 'Offer made — check your email',
  error: 'Decision issued',
}

function TimelineDot({ state, index }: { state: TimelineStepState; index: number }) {
  if (state === 'upcoming') return <div className="adm-timeline-dot">{index + 1}</div>
  if (state === 'done' || state === 'success') return <div className="adm-timeline-dot"><CheckCircle2 size={16} /></div>
  if (state === 'attention') return <div className="adm-timeline-dot"><CircleAlert size={16} /></div>
  if (state === 'error') return <div className="adm-timeline-dot"><X size={16} /></div>
  return <div className="adm-timeline-dot"><Clock3 size={15} /></div>
}

export default function AdmissionsStatus() {
  const [searchParams, setSearchParams] = useSearchParams()
  const refParam = searchParams.get('ref')

  const [reference, setReference] = useState(() => (refParam ?? '').toUpperCase())
  const [email, setEmail] = useState(() => {
    const initial = (refParam ?? '').toUpperCase()
    if (!initial) return ''
    return listLocalApplications().find((record) => record.reference.toUpperCase() === initial)?.email ?? ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AdmissionStatusResult | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [recent, setRecent] = useState<AdmissionApplicationRecord[]>(() => listLocalApplications())
  const [copied, setCopied] = useState(false)

  // Keep the form in sync when the applicant arrives from the wizard's success screen.
  useEffect(() => {
    if (refParam) setReference(refParam.toUpperCase())
  }, [refParam])

  async function handleLookup(event: FormEvent) {
    event.preventDefault()
    const trimmedReference = reference.trim().toUpperCase()
    const trimmedEmail = email.trim()
    if (trimmedReference.length < 6) {
      setError('Enter the full reference number from your submission confirmation, for example CPGH-ADM-2026-K7F3M2.')
      return
    }
    if (!emailPattern.test(trimmedEmail)) {
      setError('Enter the email address you used in your application.')
      return
    }
    setError('')
    setResult(null)
    setNotFound(false)
    setLoading(true)
    try {
      const found = await lookupAdmissionApplication(trimmedReference, trimmedEmail)
      if (found) {
        setResult(found)
        setSearchParams({ ref: found.reference }, { replace: true })
      } else {
        setNotFound(true)
      }
    } finally {
      setLoading(false)
      setRecent(listLocalApplications())
    }
  }

  async function copyReference() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.reference)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // Clipboard access can be unavailable; the reference stays visible on screen.
    }
  }

  function fillFromRecord(record: AdmissionApplicationRecord) {
    setReference(record.reference)
    setEmail(record.email)
    setError('')
  }

  const meta = result ? admissionStatusMeta(result.status) : null

  return (
    <>
      <AdmissionsHero
        eyebrow="Admissions · Application status"
        title="Track your application."
        text="Enter the reference number you received when you submitted your application, together with the email address you applied with, to see your current status and what happens next."
      />

      <section className="adm-status-shell">
        <div className="container">
          <div className="adm-status-grid">
            <div className="adm-status-card">
              <h2>Application lookup</h2>
              <p>Your reference number was shown on the confirmation screen and sent to your email after submission.</p>
              <form onSubmit={handleLookup} noValidate style={{ marginTop: 18 }}>
                <div className="adm-field" style={{ marginBottom: 14 }}>
                  <span>Reference number <em className="req">*</em></span>
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value.toUpperCase())}
                    placeholder="CPGH-ADM-2026-XXXXXX"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="adm-field" style={{ marginBottom: 14 }}>
                  <span>Email address <em className="req">*</em></span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                {error && <p className="adm-alert error" style={{ marginBottom: 14 }} role="alert">{error}</p>}
                <button className="button button-primary" type="submit" disabled={loading}>
                  {loading ? 'Checking your application…' : <>Check status <Search size={16} /></>}
                </button>
              </form>

              {recent.length > 0 && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
                  <span className="adm-pill alt">Saved on this device</span>
                  <div className="adm-recent-list">
                    {recent.slice(0, 4).map((record) => (
                      <button key={record.reference} type="button" className="adm-recent-item" onClick={() => fillFromRecord(record)}>
                        <span>
                          <strong>{record.reference}</strong>
                          <small>{record.firstChoiceTitle || 'Programme choice pending'} · {formatAdmissionDateTime(record.submittedAt)}</small>
                        </span>
                        <span className="adm-status-badge neutral">{admissionStatusLabels[record.status]}</span>
                      </button>
                    ))}
                  </div>
                  <p style={{ marginTop: 10, fontSize: 11.5 }}>Applications you submit from this browser appear here for quick access — even before you note down your reference.</p>
                </div>
              )}
            </div>

            <div>
              {result && meta ? (
                <div className="adm-status-card">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={`adm-status-badge ${meta.tone}`}>{admissionStatusLabels[result.status]}</span>
                    <small style={{ color: 'var(--muted)' }}>Last updated {formatAdmissionDateTime(result.updatedAt)}</small>
                  </div>
                  <h2 style={{ marginTop: 14 }}>{result.fullName || 'Your application'}</h2>
                  <p>{meta.guidance}</p>

                  <div className="adm-timeline">
                    {admissionStatusTimeline(result.status).map((step, index) => (
                      <div className={`adm-timeline-item ${step.state}`} key={step.label}>
                        <TimelineDot state={step.state} index={index} />
                        <div>
                          <strong>{step.label}</strong>
                          <small>{timelineStateCopy[step.state]}</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  <dl className="adm-status-meta">
                    <div>
                      <dt>Reference</dt>
                      <dd>{result.reference}</dd>
                    </div>
                    <div>
                      <dt>First choice</dt>
                      <dd>{result.firstChoiceTitle || 'Not set'}</dd>
                    </div>
                    <div>
                      <dt>Second choice</dt>
                      <dd>{result.secondChoiceTitle || 'Not set'}</dd>
                    </div>
                    <div>
                      <dt>Submitted</dt>
                      <dd>{formatAdmissionDateTime(result.submittedAt)}</dd>
                    </div>
                  </dl>

                  {result.documents && result.documents.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>Documents attached</h3>
                      <div className="adm-uploaded-list">
                        {result.documents.map((document) => (
                          <div className="adm-uploaded-item" key={document.path || document.name}>
                            <FileText size={15} />
                            <span>{document.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.statusNote && <p className="adm-alert info" style={{ marginTop: 18 }}><Info size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{result.statusNote}</p>}

                  {result.storage === 'local' && (
                    <p className="adm-alert info" style={{ marginTop: 18 }}>
                      <Info size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      This application is stored on this device. Tracking from other devices and status updates from the admissions team are enabled once the admissions register is connected — until then, keep this reference number safe and contact the admissions office with any questions.
                    </p>
                  )}

                  <div className="adm-reference-box" style={{ justifyContent: 'space-between', maxWidth: 'none' }}>
                    <small style={{ flexBasis: 0, marginRight: 10 }}>Your reference</small>
                    <strong style={{ fontSize: 16 }}>{result.reference}</strong>
                    <button type="button" className="adm-link-button" onClick={copyReference}>
                      {copied ? <><CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Copied</> : <><Copy size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Copy</>}
                    </button>
                  </div>

                  <div className="adm-success-actions" style={{ justifyContent: 'flex-start' }}>
                    <Link className="button button-primary" to="/admissions/apply">Start another application <ArrowRight size={16} /></Link>
                    <Link className="button button-light" to="/contact">Contact admissions</Link>
                  </div>
                </div>
              ) : (
                <div className="adm-status-card">
                  <ClipboardCheck size={26} style={{ color: 'var(--blue)' }} />
                  <h2 style={{ marginTop: 12 }}>{notFound ? 'No matching application found' : 'Your status will appear here'}</h2>
                  {notFound ? (
                    <>
                      <p>We could not find an application with that reference number and email address. Please check both and try again.</p>
                      <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
                        <li>Copy the reference exactly as it appears in your confirmation email.</li>
                        <li>Use the same email address you entered in the application.</li>
                        <li>If you applied on another device, this browser may not hold your record yet — contact the admissions office and we will look it up for you.</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p>Enter your reference number and email on the left to view your application. You will see your current status, a step-by-step timeline and the programme choices attached to your application.</p>
                      <div className="adm-doc-list" style={{ marginTop: 16 }}>
                        <div className="adm-doc-item">
                          <ShieldCheck size={18} />
                          <span><strong>Private</strong><small>Your application details are only shown to the applicant and the admissions team.</small></span>
                        </div>
                        <div className="adm-doc-item">
                          <Search size={18} />
                          <span><strong>Not applied yet?</strong><small>The guided application takes about ten minutes and you receive your reference immediately.</small></span>
                        </div>
                      </div>
                      <div className="adm-success-actions" style={{ justifyContent: 'flex-start' }}>
                        <Link className="button button-primary" to="/admissions/apply">Apply now <ArrowRight size={16} /></Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="adm-section soft">
        <div className="container">
          <AdmissionsSectionHead
            eyebrow="Status guide"
            title="What each status means."
            text="Every application moves through the same stages. Here is what each status tells you, and what you should do."
          />
          <div className="adm-grid-3">
            {statusOrder.map((status) => {
              const statusMeta = admissionStatusMeta(status)
              return (
                <div className="adm-card" key={status}>
                  <span className={`adm-status-badge ${statusMeta.tone}`}>{admissionStatusLabels[status]}</span>
                  <p style={{ marginTop: 12 }}>{statusMeta.guidance}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <AdmissionsHelpBand />
    </>
  )
}
