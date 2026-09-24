import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Copy, FileText, Search, ShieldCheck, X } from 'lucide-react'
import { getCurrentProfile, type Profile } from '../lib/supabase'
import FileUploader from '../components/FileUploader'
import { ProgrammeCard } from './AdmissionsShared'
import {
  clearAdmissionDraft,
  emptyApplicationInput,
  fetchAdmissionsProgrammes,
  filterProgrammes,
  formatAdmissionDateTime,
  loadAdmissionDraft,
  programmeLevelLabels,
  saveAdmissionDraft,
  submitAdmissionApplication,
  type AdmissionApplicationInput,
  type AdmissionApplicationRecord,
  type Programme,
  type ProgrammeLevel,
} from './admissionsApi'
import './admissions.css'

type DialCountry = { code: string; name: string; dial: string; flag: string }

const dialCountries: DialCountry[] = [
  { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
  { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
  { code: 'BI', name: 'Burundi', dial: '+257', flag: '🇧🇮' },
  { code: 'CD', name: 'DR Congo', dial: '+243', flag: '🇨🇩' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'ET', name: 'Ethiopia', dial: '+251', flag: '🇪🇹' },
  { code: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
]

const nationalityOptions = ['Rwanda', ...dialCountries.filter((country) => country.code !== 'RW').map((country) => country.name), 'Other']

const residenceOptions: Array<[string, string]> = [
  ['KIGALI', 'Kigali City'],
  ['EASTERN', 'Eastern Province'],
  ['NORTHERN', 'Northern Province'],
  ['SOUTHERN', 'Southern Province'],
  ['WESTERN', 'Western Province'],
  ['OTHER', 'Outside Rwanda'],
]

const educationOptions: Array<[string, string]> = [
  ['PRIMARY', 'Primary education'],
  ['SECONDARY', 'Secondary education (A2 certificate)'],
  ['DIPLOMA', 'Diploma / healthcare diploma'],
  ['BACHELOR', 'Bachelor degree'],
  ['MASTER', 'Master degree'],
  ['OTHER', 'Other qualification'],
]

const languageOptions: Array<[string, string]> = [
  ['KINYARWANDA', 'Kinyarwanda'],
  ['ENGLISH', 'English'],
  ['FRENCH', 'French'],
  ['OTHER', 'Other language'],
]

const wizardSteps = ['Applicant account', 'Personal information', 'Academic information', 'Programme selection', 'Required documents', 'Review & submit']

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const phonePattern = /^\+\d{8,15}$/

const formatLocalPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
}

function splitPhone(full: string): { country: DialCountry; local: string } {
  const match = [...dialCountries].sort((a, b) => b.dial.length - a.dial.length).find((country) => full.startsWith(country.dial))
  if (match) return { country: match, local: formatLocalPhone(full.slice(match.dial.length)) }
  return { country: dialCountries[0], local: formatLocalPhone(full.replace(/^\+/, '')) }
}

function calculateAge(value: string): number | null {
  if (!value) return null
  const birth = new Date(value)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

export default function AdmissionsApply() {
  const [data, setData] = useState<AdmissionApplicationInput>(emptyApplicationInput)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<AdmissionApplicationRecord | null>(null)
  const [syncNotice, setSyncNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [draftRestored, setDraftRestored] = useState(false)
  const [savedAt, setSavedAt] = useState('')
  const [uploadKey] = useState(() => `draft-${crypto.randomUUID()}`)
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [programmesError, setProgrammesError] = useState<string | null>(null)
  const [programmesLoading, setProgrammesLoading] = useState(true)
  const [programmeQuery, setProgrammeQuery] = useState('')
  const [programmeLevel, setProgrammeLevel] = useState<ProgrammeLevel | 'ALL'>('ALL')
  const [phoneCountry, setPhoneCountry] = useState<DialCountry>(dialCountries[0])
  const [phoneLocal, setPhoneLocal] = useState('')
  const [documentConfirmation, setDocumentConfirmation] = useState({ id: false, certificates: false, photo: false })
  const [declaration, setDeclaration] = useState(false)

  // Restore the draft, the signed-in applicant and the live programme catalogue.
  useEffect(() => {
    let active = true
    const draft = loadAdmissionDraft()
    if (draft) {
      setData(draft.data)
      setSavedAt(draft.savedAt)
      setDraftRestored(true)
      if (draft.data.phone) {
        const parsed = splitPhone(draft.data.phone)
        setPhoneCountry(parsed.country)
        setPhoneLocal(parsed.local)
      }
    }
    getCurrentProfile()
      .then((currentProfile) => { if (active) setProfile(currentProfile) })
      .catch(() => { /* The applicant can continue as a guest. */ })
      .finally(() => { if (active) setCheckingSession(false) })
    fetchAdmissionsProgrammes()
      .then((result) => {
        if (!active) return
        setProgrammes(result.programmes)
        setProgrammesError(result.error)
      })
      .finally(() => { if (active) setProgrammesLoading(false) })
    return () => { active = false }
  }, [])

  // Prefill empty fields from the signed-in profile (never overwrites answers).
  useEffect(() => {
    if (!profile) return
    setData((previous) => ({
      ...previous,
      fullName: previous.fullName || profile.full_name || '',
      email: previous.email || profile.email || '',
      phone: previous.phone || profile.phone || '',
      sex: previous.sex || profile.sex || '',
      nationality: previous.nationality || profile.country || 'Rwanda',
      residence: previous.residence || profile.residence || '',
      address: previous.address || profile.address || '',
      educationLevel: previous.educationLevel || profile.diploma || '',
      languages: previous.languages || profile.languages || '',
    }))
    if (!data.phone && profile.phone) {
      const parsed = splitPhone(profile.phone)
      setPhoneCountry(parsed.country)
      setPhoneLocal(parsed.local)
    }
    // Runs once when the profile becomes available; later edits stay untouched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // Autosave the draft while the applicant works.
  useEffect(() => {
    if (submitted) return
    if (JSON.stringify(data) === JSON.stringify(emptyApplicationInput)) return
    setSavedAt(saveAdmissionDraft(data))
  }, [data, submitted])

  useEffect(() => {
    if (submitted) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [submitted])

  const update = (field: keyof AdmissionApplicationInput, value: string) => setData((previous) => ({ ...previous, [field]: value }))

  function validateStep(stepIndex: number): string {
    if (stepIndex === 1) {
      if (data.fullName.trim().length < 3) return 'Enter your full name as it appears on your ID or passport.'
      if (!emailPattern.test(data.email.trim())) return 'Enter a valid email address — this is where we will contact you.'
      if (!phonePattern.test(data.phone)) return 'Enter a valid phone number, including the country code.'
      if (!data.dateOfBirth) return 'Enter your date of birth.'
      const age = calculateAge(data.dateOfBirth)
      if (age === null || age < 15 || age > 100) return 'Applicants must be between 15 and 100 years old.'
      if (!data.sex) return 'Select your sex.'
      if (!data.nationality.trim()) return 'Select or enter your nationality.'
      if (!data.residence) return 'Select your current residence.'
      if (data.address.trim().length < 5) return 'Enter your full address (at least 5 characters).'
    }
    if (stepIndex === 2) {
      if (!data.educationLevel) return 'Select your highest completed qualification.'
      if (data.institution.trim().length < 3) return 'Enter the institution where you completed your highest qualification.'
      const year = Number(data.graduationYear)
      const currentYear = new Date().getFullYear()
      if (!data.graduationYear || Number.isNaN(year) || year < 1950 || year > currentYear) return `Enter a valid graduation year between 1950 and ${currentYear}.`
      if (!data.languages) return 'Select your strongest language of study.'
    }
    if (stepIndex === 3) {
      if (!data.firstChoiceId) return 'Select a first-choice programme to continue.'
      if (data.secondChoiceId && data.secondChoiceId === data.firstChoiceId) return 'Your second choice must be different from your first choice.'
    }
    if (stepIndex === 4) {
      if (!documentConfirmation.id || !documentConfirmation.certificates || !documentConfirmation.photo) return 'Confirm that you have the required documents ready before continuing.'
    }
    if (stepIndex === 5 && !declaration) {
      return 'Please confirm that the information you provided is accurate before submitting.'
    }
    return ''
  }

  function goNext() {
    const stepError = validateStep(step)
    if (stepError) { setError(stepError); return }
    setError('')
    setStep((current) => Math.min(current + 1, wizardSteps.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    setError('')
    setStep((current) => Math.max(current - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startOver() {
    clearAdmissionDraft()
    setData(emptyApplicationInput)
    setStep(0)
    setError('')
    setDraftRestored(false)
    setSavedAt('')
    setPhoneLocal('')
    setPhoneCountry(dialCountries[0])
    setDocumentConfirmation({ id: false, certificates: false, photo: false })
    setDeclaration(false)
  }

  function selectProgrammeAs(programme: Programme, rank: 1 | 2) {
    setData((previous) => {
      const next = { ...previous }
      const id = String(programme.id)
      if (rank === 1) {
        next.firstChoiceId = id
        next.firstChoiceTitle = programme.title
        if (next.secondChoiceId === id) { next.secondChoiceId = ''; next.secondChoiceTitle = '' }
      } else {
        next.secondChoiceId = id
        next.secondChoiceTitle = programme.title
        if (next.firstChoiceId === id) { next.firstChoiceId = ''; next.firstChoiceTitle = '' }
      }
      return next
    })
  }

  async function handleSubmit() {
    const stepError = validateStep(5)
    if (stepError) { setError(stepError); return }
    setSubmitting(true)
    setError('')
    try {
      const result = await submitAdmissionApplication({
        ...data,
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        institution: data.institution.trim(),
        address: data.address.trim(),
        personalStatement: data.personalStatement.trim(),
      })
      setSubmitted(result.record)
      setSyncNotice(result.syncNotice)
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit your application right now. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyReference() {
    if (!submitted) return
    try {
      await navigator.clipboard.writeText(submitted.reference)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard access can be blocked; the reference stays visible on screen.
    }
  }

  if (submitted) {
    const firstName = submitted.fullName.split(' ')[0] || 'applicant'
    return (
      <section className="adm-section">
        <div className="container">
          <div className="adm-success-card">
            <CheckCircle2 />
            <div className="eyebrow" style={{ justifyContent: 'center' }}>Application submitted</div>
            <h1>Thank you, {firstName}.</h1>
            <p>
              Your application for {submitted.firstChoiceTitle || 'your chosen programme'} has been received and queued for review by the admissions team.
              Keep your reference number safe — you will use it for every follow-up.
            </p>
            <div className="adm-reference-box">
              <small>Your application reference</small>
              <strong>{submitted.reference}</strong>
              <button type="button" className="button button-light" onClick={copyReference}>{copied ? 'Copied' : 'Copy'} <Copy size={15} /></button>
            </div>
            {syncNotice && <p style={{ fontSize: 12, marginTop: 14 }}>{syncNotice}</p>}
            <div className="adm-success-actions">
              <Link className="button button-primary" to={`/admissions/status?ref=${encodeURIComponent(submitted.reference)}`}>Track application status <ArrowRight size={16} /></Link>
              <Link className="button button-dark" to="/admissions">Back to admissions</Link>
            </div>
            <p style={{ fontSize: 12, marginTop: 26 }}>
              Submitted {formatAdmissionDateTime(submitted.submittedAt)} · We will contact you at {submitted.email} as soon as your status changes.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const visibleProgrammes = filterProgrammes(programmes, programmeLevel, programmeQuery)
  const initials = (profile?.full_name || '').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'AP'

  return (
    <>
      <section className="adm-wizard-hero">
        <div className="container">
          <div className="eyebrow"><span className="eyebrow-dot" /> Admissions · Application</div>
          <h1>Apply to CarePath Training Institute</h1>
          <p>
            Complete the steps below to submit your application. Your progress is saved as a draft on this device, so you can leave and return at any time.
          </p>
        </div>
      </section>

      <div className="container adm-wizard-layout">
        <aside className="adm-wizard-side">
          <div className="adm-step-list" role="list">
            {wizardSteps.map((label, index) => (
              <button
                type="button"
                role="listitem"
                key={label}
                className={`adm-step-item ${index === step ? 'current' : ''} ${index < step ? 'complete' : ''}`}
                onClick={() => { if (index <= step) { setStep(index); setError('') } }}
              >
                <i>{index < step ? '✓' : index + 1}</i>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="adm-progress" aria-hidden="true"><span style={{ width: `${((step + 1) / wizardSteps.length) * 100}%` }} /></div>
          <div className="adm-draft-note">
            {draftRestored ? 'Draft restored from this device.' : 'Your answers are saved as a draft on this device.'}
            {savedAt && <span> Last saved {formatAdmissionDateTime(savedAt)}.</span>}
            <div style={{ marginTop: 10 }}>
              <button type="button" className="adm-link-button danger" onClick={startOver}>Start over and clear the draft</button>
            </div>
          </div>
        </aside>

        <div className="adm-wizard-panel">
          {step === 0 && (
            <div className="adm-account-card">
              <div>
                <h2>Applicant account</h2>
                <p style={{ marginTop: 8 }}>An account keeps your applications in one place and makes future applications faster. You can also continue as a guest and create an account later.</p>
              </div>
              {checkingSession ? (
                <p>Checking your session…</p>
              ) : profile ? (
                <div className="adm-account-row">
                  <span className="adm-account-avatar">{initials}</span>
                  <span>
                    <strong>{profile.full_name}</strong>
                    <small>{profile.email} · Signed in — your details will be prefilled.</small>
                  </span>
                </div>
              ) : (
                <>
                  <div className="adm-guest-actions">
                    <Link className="button button-primary" to="/login?next=%2Fadmissions%2Fapply">Sign in <ArrowRight size={16} /></Link>
                    <Link className="button button-dark" to="/register?next=%2Fadmissions%2Fapply">Create an account</Link>
                  </div>
                  <p className="adm-alert info">
                    Applying as a guest works too. You will still receive a reference number and can track your application on this device — you can create an account at any time.
                  </p>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={(event) => event.preventDefault()}>
              <h2>Personal information</h2>
              <p style={{ margin: '8px 0 22px' }}>Tell us who you are. This information is used to contact you and to prepare your student record.</p>
              <div className="adm-form-grid">
                <label className="adm-field wide">
                  <span>Full name<span className="req">*</span></span>
                  <input value={data.fullName} onChange={(event) => update('fullName', event.target.value)} placeholder="As it appears on your ID or passport" autoComplete="name" />
                </label>
                <label className="adm-field">
                  <span>Email address<span className="req">*</span></span>
                  <input type="email" value={data.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" autoComplete="email" />
                </label>
                <label className="adm-field">
                  <span>Phone number<span className="req">*</span></span>
                  <div className="adm-phone-row">
                    <select
                      value={phoneCountry.code}
                      aria-label="Country dialling code"
                      onChange={(event) => {
                        const country = dialCountries.find((item) => item.code === event.target.value) ?? dialCountries[0]
                        setPhoneCountry(country)
                        update('phone', `${country.dial}${phoneLocal.replace(/\D/g, '')}`)
                      }}
                    >
                      {dialCountries.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.dial}</option>)}
                    </select>
                    <input
                      type="tel"
                      value={phoneLocal}
                      onChange={(event) => {
                        const formatted = formatLocalPhone(event.target.value)
                        setPhoneLocal(formatted)
                        update('phone', `${phoneCountry.dial}${formatted.replace(/\D/g, '')}`)
                      }}
                      placeholder={phoneCountry.code === 'RW' ? '78X XXX XXX' : 'Phone number'}
                      autoComplete="tel"
                    />
                  </div>
                </label>
                <label className="adm-field">
                  <span>Date of birth<span className="req">*</span></span>
                  <input type="date" value={data.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} />
                  <small className="hint">Applicants must be at least 15 years old.</small>
                </label>
                <label className="adm-field">
                  <span>Sex<span className="req">*</span></span>
                  <select value={data.sex} onChange={(event) => update('sex', event.target.value)}>
                    <option value="">Select sex</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className="adm-field">
                  <span>Nationality<span className="req">*</span></span>
                  <select value={data.nationality} onChange={(event) => update('nationality', event.target.value)}>
                    <option value="">Select nationality</option>
                    {nationalityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="adm-field">
                  <span>Current residence<span className="req">*</span></span>
                  <select value={data.residence} onChange={(event) => update('residence', event.target.value)}>
                    <option value="">Select residence</option>
                    {residenceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="adm-field wide">
                  <span>Address<span className="req">*</span></span>
                  <textarea value={data.address} onChange={(event) => update('address', event.target.value)} placeholder="District, sector, street or village" rows={3} />
                </label>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(event) => event.preventDefault()}>
              <h2>Academic information</h2>
              <p style={{ margin: '8px 0 22px' }}>Your academic background helps the admissions team review your eligibility for the programme.</p>
              <div className="adm-form-grid">
                <label className="adm-field">
                  <span>Highest completed qualification<span className="req">*</span></span>
                  <select value={data.educationLevel} onChange={(event) => update('educationLevel', event.target.value)}>
                    <option value="">Select qualification</option>
                    {educationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="adm-field">
                  <span>Graduation year<span className="req">*</span></span>
                  <input type="number" min="1950" max={new Date().getFullYear()} value={data.graduationYear} onChange={(event) => update('graduationYear', event.target.value)} placeholder="e.g. 2024" />
                </label>
                <label className="adm-field wide">
                  <span>Institution<span className="req">*</span></span>
                  <input value={data.institution} onChange={(event) => update('institution', event.target.value)} placeholder="School, college or university you attended" />
                </label>
                <label className="adm-field">
                  <span>Strongest language of study<span className="req">*</span></span>
                  <select value={data.languages} onChange={(event) => update('languages', event.target.value)}>
                    <option value="">Select language</option>
                    {languageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="adm-field wide">
                  <span>Personal statement (optional)</span>
                  <textarea
                    value={data.personalStatement}
                    onChange={(event) => update('personalStatement', event.target.value.slice(0, 1200))}
                    placeholder="Tell us why you want to join this programme and how it fits your goals (max 1200 characters)."
                    rows={5}
                  />
                  <small className="hint">{data.personalStatement.length}/1200 characters</small>
                </label>
              </div>
            </form>
          )}

          {step === 3 && (
            <div>
              <h2>Programme selection</h2>
              <p style={{ margin: '8px 0 18px' }}>Search and filter the catalogue, review the entry requirements shown with each programme, then choose a first and (optionally) a second preference.</p>

              {(data.firstChoiceId || data.secondChoiceId) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
                  {data.firstChoiceId && (
                    <span className="adm-selected-tag">First choice: {data.firstChoiceTitle} <X size={13} style={{ cursor: 'pointer' }} onClick={() => setData((previous) => ({ ...previous, firstChoiceId: '', firstChoiceTitle: '' }))} /></span>
                  )}
                  {data.secondChoiceId && (
                    <span className="adm-selected-tag second">Second choice: {data.secondChoiceTitle} <X size={13} style={{ cursor: 'pointer' }} onClick={() => setData((previous) => ({ ...previous, secondChoiceId: '', secondChoiceTitle: '' }))} /></span>
                  )}
                </div>
              )}

              <div className="adm-filter">
                <label className="search-field">
                  <Search size={18} />
                  <input value={programmeQuery} onChange={(event) => setProgrammeQuery(event.target.value)} placeholder="Search programmes" aria-label="Search programmes" />
                </label>
                <select value={programmeLevel} onChange={(event) => setProgrammeLevel(event.target.value as ProgrammeLevel | 'ALL')} aria-label="Filter by study level">
                  <option value="ALL">All levels</option>
                  <option value="UNDERGRADUATE">{programmeLevelLabels.UNDERGRADUATE}</option>
                  <option value="POSTGRADUATE">{programmeLevelLabels.POSTGRADUATE}</option>
                  <option value="PROFESSIONAL">{programmeLevelLabels.PROFESSIONAL}</option>
                </select>
              </div>

              {programmesLoading ? (
                <div className="adm-card"><p>Loading programmes…</p></div>
              ) : programmesError ? (
                <div className="adm-card"><p>{programmesError}</p></div>
              ) : visibleProgrammes.length === 0 ? (
                <div className="adm-card">
                  <p>No programmes match your search. Adjust the filters, or contact the admissions office and we will guide you to the right pathway.</p>
                  <Link className="card-link" to="/contact">Contact admissions <ArrowRight size={14} /></Link>
                </div>
              ) : (
                <div className="adm-programme-grid">
                  {visibleProgrammes.map((programme) => (
                    <ProgrammeCard
                      key={programme.id}
                      programme={programme}
                      actions={(
                        <>
                          <button
                            type="button"
                            className={`button ${data.firstChoiceId === String(programme.id) ? 'button-dark' : 'button-primary'}`}
                            disabled={data.firstChoiceId === String(programme.id)}
                            onClick={() => selectProgrammeAs(programme, 1)}
                          >
                            {data.firstChoiceId === String(programme.id) ? 'First choice selected' : 'Select as first choice'}
                          </button>
                          <button
                            type="button"
                            className="button button-light"
                            disabled={data.secondChoiceId === String(programme.id)}
                            onClick={() => selectProgrammeAs(programme, 2)}
                          >
                            {data.secondChoiceId === String(programme.id) ? 'Second choice selected' : 'Add as second choice'}
                          </button>
                        </>
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <h2>Required documents</h2>
              <p style={{ margin: '8px 0 18px' }}>Confirm which documents you have ready, and upload copies if you can. Uploads are optional — documents can also be provided later if the admissions team requests them.</p>
              <div className="adm-checklist">
                <label className="adm-check-item">
                  <input type="checkbox" checked={documentConfirmation.id} onChange={() => setDocumentConfirmation((previous) => ({ ...previous, id: !previous.id }))} />
                  <span><strong>National ID or passport</strong><br />A clear copy used to confirm your identity.</span>
                </label>
                <label className="adm-check-item">
                  <input type="checkbox" checked={documentConfirmation.certificates} onChange={() => setDocumentConfirmation((previous) => ({ ...previous, certificates: !previous.certificates }))} />
                  <span><strong>Academic certificates or transcripts</strong><br />Certificates for your highest completed qualification, such as your A2 certificate.</span>
                </label>
                <label className="adm-check-item">
                  <input type="checkbox" checked={documentConfirmation.photo} onChange={() => setDocumentConfirmation((previous) => ({ ...previous, photo: !previous.photo }))} />
                  <span><strong>Passport-size photograph</strong><br />A recent photograph for your student file.</span>
                </label>
              </div>

              <div style={{ marginTop: 22 }}>
                <span className="adm-field" style={{ display: 'block' }}><span>Upload documents (optional)</span></span>
                <p style={{ fontSize: 12, margin: '6px 0 4px' }}>PDF, JPG or PNG up to 10 MB per file. If uploading is unavailable, you can bring or send your documents later.</p>
                <FileUploader
                  key={`${uploadKey}-${data.documents.length}`}
                  bucket="admission-files"
                  pathPrefix={`applications/${uploadKey}`}
                  accept="application/pdf,image/jpeg,image/png"
                  maxBytes={10 * 1024 * 1024}
                  label="Upload a document"
                  onUploaded={(file) => setData((previous) => ({ ...previous, documents: [...previous.documents, { name: file.name, path: file.path, type: file.type, size: file.size }] }))}
                />
                {data.documents.length > 0 && (
                  <div className="adm-uploaded-list">
                    {data.documents.map((document) => (
                      <div className="adm-uploaded-item" key={document.path}>
                        <FileText size={15} />
                        <span title={document.name}>{document.name}</span>
                        <button type="button" aria-label={`Remove ${document.name}`} onClick={() => setData((previous) => ({ ...previous, documents: previous.documents.filter((item) => item.path !== document.path) }))}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!profile && (
                <p className="adm-alert info" style={{ marginTop: 20 }}>
                  Applying as a guest? Your uploaded documents are linked to this draft. Creating an account helps the admissions team match documents to you faster.
                </p>
              )}
            </div>
          )}

          {step === 5 && (
            <div>
              <h2>Review your application</h2>
              <p style={{ margin: '8px 0 22px' }}>Check every section carefully. Use the edit links to correct anything before submitting.</p>
              <div style={{ display: 'grid', gap: 16 }}>
                <div className="adm-review-block">
                  <header><h3>Personal information</h3><button type="button" className="adm-link-button" onClick={() => setStep(1)}>Edit</button></header>
                  <dl className="adm-review-list">
                    <div><dt>Full name</dt><dd>{data.fullName || '—'}</dd></div>
                    <div><dt>Email</dt><dd>{data.email || '—'}</dd></div>
                    <div><dt>Phone</dt><dd>{data.phone || '—'}</dd></div>
                    <div><dt>Date of birth</dt><dd>{data.dateOfBirth || '—'}</dd></div>
                    <div><dt>Sex</dt><dd>{data.sex || '—'}</dd></div>
                    <div><dt>Nationality</dt><dd>{data.nationality || '—'}</dd></div>
                    <div><dt>Residence</dt><dd>{data.residence || '—'}</dd></div>
                    <div><dt>Address</dt><dd>{data.address || '—'}</dd></div>
                  </dl>
                </div>
                <div className="adm-review-block">
                  <header><h3>Academic information</h3><button type="button" className="adm-link-button" onClick={() => setStep(2)}>Edit</button></header>
                  <dl className="adm-review-list">
                    <div><dt>Qualification</dt><dd>{data.educationLevel || '—'}</dd></div>
                    <div><dt>Institution</dt><dd>{data.institution || '—'}</dd></div>
                    <div><dt>Graduation year</dt><dd>{data.graduationYear || '—'}</dd></div>
                    <div><dt>Language of study</dt><dd>{data.languages || '—'}</dd></div>
                    <div style={{ gridColumn: '1 / -1' }}><dt>Personal statement</dt><dd>{data.personalStatement || 'Not provided'}</dd></div>
                  </dl>
                </div>
                <div className="adm-review-block">
                  <header><h3>Programme choices</h3><button type="button" className="adm-link-button" onClick={() => setStep(3)}>Edit</button></header>
                  <dl className="adm-review-list">
                    <div><dt>First choice</dt><dd>{data.firstChoiceTitle || '—'}</dd></div>
                    <div><dt>Second choice</dt><dd>{data.secondChoiceTitle || 'Not selected'}</dd></div>
                  </dl>
                </div>
                <div className="adm-review-block">
                  <header><h3>Documents</h3><button type="button" className="adm-link-button" onClick={() => setStep(4)}>Edit</button></header>
                  {data.documents.length === 0 ? (
                    <p style={{ fontSize: 13 }}>No documents uploaded yet. You confirmed the required documents are ready and can provide them when the admissions team requests them.</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
                      {data.documents.map((document) => <li key={document.path}>{document.name}</li>)}
                    </ul>
                  )}
                </div>
              </div>
              <label className="adm-confirm-row" style={{ marginTop: 18 }}>
                <input type="checkbox" checked={declaration} onChange={() => setDeclaration((value) => !value)} />
                <span>I confirm that the information provided in this application is accurate and complete. I understand that providing false information may lead to my application being withdrawn.</span>
              </label>
            </div>
          )}

          {error && <p className="adm-alert error" style={{ marginTop: 18 }} role="alert">{error}</p>}

          <div className="adm-wizard-actions">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {step > 0 && <button type="button" className="button button-light" onClick={goBack}>Back</button>}
              {step > 0 && <button type="button" className="adm-link-button" onClick={() => { setStep(0); setError('') }}>Save &amp; come back</button>}
            </div>
            {step < wizardSteps.length - 1 ? (
              <button type="button" className="button button-primary" onClick={goNext}>Continue <ArrowRight size={16} /></button>
            ) : (
              <button type="button" className="button button-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit application'} {!submitting && <ArrowRight size={16} />}
              </button>
            )}
          </div>

          <p style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#8ba0a3' }}>
            <ShieldCheck size={15} /> Your information is used only for admissions purposes and is shared with the admissions team.
          </p>
        </div>
      </div>
    </>
  )
}
