import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Award, BookOpen, CalendarDays, ChevronDown, Clock3, Mail, MapPin, Search, ShieldCheck } from 'lucide-react'
import { fetchAdmissionsProgrammes, filterProgrammes, programmeLevelLabels, type Programme, type ProgrammeLevel } from './admissionsApi'
import { ADMISSIONS_DEFAULTS, useSiteContent } from '../lib/siteContent'
import './admissions.css'

/** Menu shown in the main navigation dropdown and on the admissions sub-nav. */
export const admissionsMenuLinks: Array<[string, string]> = [
  ['Admissions', '/admissions'],
  ['Undergraduate', '/admissions/undergraduate'],
  ['Postgraduate', '/admissions/postgraduate'],
  ['Entry Requirements', '/admissions/entry-requirements'],
  ['How to Apply', '/admissions/how-to-apply'],
  ['Application', '/admissions/apply'],
  ['Application Status', '/admissions/status'],
  ['Important Dates', '/admissions/important-dates'],
  ['Frequently Asked Questions', '/admissions/faq'],
]

const subnavLinks: Array<[string, string]> = [
  ['Overview', '/admissions'],
  ['Undergraduate', '/admissions/undergraduate'],
  ['Postgraduate', '/admissions/postgraduate'],
  ['Entry requirements', '/admissions/entry-requirements'],
  ['How to apply', '/admissions/how-to-apply'],
  ['Apply', '/admissions/apply'],
  ['Application status', '/admissions/status'],
  ['Important dates', '/admissions/important-dates'],
  ['FAQ', '/admissions/faq'],
]

export function AdmissionsSubnav() {
  const location = useLocation()
  return (
    <div className="adm-subnav">
      <div className="container adm-subnav-inner">
        {subnavLinks.map(([label, path]) => (
          <Link key={path} to={path} className={location.pathname === path ? 'active' : ''}>{label}</Link>
        ))}
      </div>
    </div>
  )
}

export function AdmissionsHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return (
    <>
      <section className="adm-hero">
        <div className="container">
          <div className="eyebrow"><span className="eyebrow-dot" /> {eyebrow}</div>
          <h1>{title}</h1>
          <p>{text}</p>
          {children}
        </div>
      </section>
      <AdmissionsSubnav />
    </>
  )
}

export function AdmissionsSectionHead({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="adm-section-head">
      <div className="eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  )
}

export function summariseText(text: string, max = 220): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trimEnd()}…`
}

type ProgrammeCardProps = {
  programme: Programme
  actions?: ReactNode
  /** Shown when the programme has no requirements stored in the catalogue. */
  requirementsFallback?: string
}

export function ProgrammeCard({ programme, actions, requirementsFallback }: ProgrammeCardProps) {
  const [open, setOpen] = useState(false)
  return (
    <article className="adm-programme-card">
      <div className="adm-programme-body">
        <span className="adm-pill alt">{programmeLevelLabels[programme.level]}</span>
        <h3>{programme.title}</h3>
        <div className="adm-programme-meta">
          <span><Clock3 /> {programme.duration}</span>
          <span><Award /> {programme.price}</span>
          <span><BookOpen /> {programme.category}</span>
        </div>
        <p className="adm-programme-desc">
          {programme.description ? summariseText(programme.description) : 'Full programme details are confirmed by the admissions office during review.'}
        </p>
        <button type="button" className="adm-link-button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? 'Hide programme details' : 'View programme details'} <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', verticalAlign: 'middle' }} />
        </button>
        {open && (
          <div className="adm-programme-details">
            <div>
              <h4>Entry requirements</h4>
              {programme.requirements.length > 0 ? (
                <ul>{programme.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
              ) : (
                <p className="adm-programme-desc">{requirementsFallback || 'Entry requirements for this programme are confirmed by the admissions office. See the entry requirements page for the general requirements that apply to all applicants.'}</p>
              )}
            </div>
            {programme.objectives.length > 0 && (
              <div>
                <h4>What you will learn</h4>
                <ul>{programme.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
              </div>
            )}
            <p className="adm-programme-desc">
              <Link className="card-link" to="/admissions/entry-requirements">Review full entry requirements <ArrowRight size={14} /></Link>
            </p>
          </div>
        )}
        {actions && <div className="adm-programme-actions">{actions}</div>}
      </div>
    </article>
  )
}

export const programmeLevelDescriptions: Record<ProgrammeLevel, string> = {
  UNDERGRADUATE: 'Certificate and diploma pathways for school leavers and career starters.',
  POSTGRADUATE: 'Advanced pathways for qualified professionals who want to specialise.',
  PROFESSIONAL: 'Focused short courses for practising care professionals.',
}

/** Public programme catalogue with search + level filters, fed by the live database. */
export function ProgrammeCatalogue({ defaultLevel = 'ALL', heading }: { defaultLevel?: ProgrammeLevel | 'ALL'; heading?: ReactNode }) {
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState<ProgrammeLevel | 'ALL'>(defaultLevel)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    fetchAdmissionsProgrammes()
      .then((result) => {
        if (!active) return
        setProgrammes(result.programmes)
        setError(result.error)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const visible = filterProgrammes(programmes, level, query)
  const levelCounts: Array<[ProgrammeLevel | 'ALL', number]> = [
    ['ALL', programmes.length],
    ['UNDERGRADUATE', programmes.filter((programme) => programme.level === 'UNDERGRADUATE').length],
    ['POSTGRADUATE', programmes.filter((programme) => programme.level === 'POSTGRADUATE').length],
    ['PROFESSIONAL', programmes.filter((programme) => programme.level === 'PROFESSIONAL').length],
  ]

  return (
    <div>
      {heading}
      <div className="adm-filter">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search programmes" aria-label="Search programmes" />
        </label>
        <div className="adm-chips" role="group" aria-label="Filter by study level">
          {levelCounts.map(([value, count]) => (
            <button key={value} type="button" className={`adm-chip ${level === value ? 'active' : ''}`} onClick={() => setLevel(value)}>
              {value === 'ALL' ? 'All levels' : programmeLevelLabels[value]} ({count})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="adm-card"><p>Loading the programme catalogue…</p></div>
      ) : error ? (
        <div className="adm-card"><p>{error}</p></div>
      ) : visible.length === 0 ? (
        <div className="adm-card">
          <h3>No programmes match your search yet</h3>
          <p>Programmes are published by the admissions office. Try a different search, or contact the admissions team and we will guide you to the right pathway.</p>
          <Link className="card-link" to="/contact">Contact admissions <ArrowRight size={14} /></Link>
        </div>
      ) : (
        <div className="adm-programme-grid">
          {visible.map((programme) => <ProgrammeCard key={programme.id} programme={programme} />)}
        </div>
      )}
    </div>
  )
}

export function ApplyCTA({ title = 'Ready to start your application?', text = 'Complete the online application and receive a reference number you can use to track your status.' }: { title?: string; text?: string }) {
  return (
    <section className="cta">
      <div className="container cta-inner">
        <div>
          <div className="eyebrow">Your next step</div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="adm-cta-actions">
          <Link className="button button-light" to="/admissions/apply">Apply now <ArrowRight size={16} /></Link>
          <Link className="button button-primary" to="/admissions/status">Check application status <ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>
  )
}

export function AdmissionsHelpBand() {
  const admissions = useSiteContent('content.admissions', ADMISSIONS_DEFAULTS)
  return (
    <section className="adm-section">
      <div className="container">
        <div className="adm-help-band">
          <div className="eyebrow"><span className="eyebrow-dot" /> Admissions support</div>
          <h2>Questions before you apply? Talk to our admissions team.</h2>
          <p>We help applicants choose the right programme, prepare documents and understand what happens after submission.</p>
          <div className="adm-help-grid">
            <div className="adm-help-item">
              <Mail size={20} />
              <span><strong>Email admissions</strong><small>{admissions.helper.email}</small></span>
            </div>
            <div className="adm-help-item">
              <MapPin size={20} />
              <span><strong>Visit us</strong><small>Kigali, Rwanda · Monday to Friday</small></span>
            </div>
            <div className="adm-help-item">
              <CalendarDays size={20} />
              <span><strong>Response time</strong><small>Within two working days</small></span>
            </div>
          </div>
          <div className="adm-hero-actions">
            <Link className="button button-primary" to="/contact">Contact admissions <ArrowRight size={16} /></Link>
            <Link className="button button-light" to="/admissions/faq">Read the FAQ</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export function RequiredDocumentsList() {
  const documents: Array<[string, string]> = [
    ['National ID or passport', 'A clear copy used to confirm your identity.'],
    ['Academic certificates', 'Certificates or transcripts for your highest completed qualification (for example the A2 certificate).'],
    ['Passport-size photo', 'A recent photograph for your student file.'],
    ['Additional documents (if requested)', 'The admissions team may request proof of address, sponsorship or translated documents.'],
  ]
  return (
    <div className="adm-doc-list">
      {documents.map(([title, detail]) => (
        <div className="adm-doc-item" key={title}>
          <ShieldCheck size={18} />
          <span><strong>{title}</strong><small>{detail}</small></span>
        </div>
      ))}
    </div>
  )
}
