import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, BookOpen, CalendarDays, CheckCircle2, ChevronDown, ClipboardCheck, FileText, GraduationCap, HeartPulse, Info, Languages, ListChecks, Medal, NotebookPen, ShieldCheck } from 'lucide-react'
import { fetchAdmissionsProgrammes, formatAdmissionDate, type Programme } from './admissionsApi'
import { AdmissionsHero, AdmissionsSectionHead, ApplyCTA, RequiredDocumentsList } from './AdmissionsShared'
import { ADMISSIONS_DEFAULTS, useSiteContent } from '../lib/siteContent'

export const admissionsFaqs: Array<{ question: string; answer: string }> = [
  {
    question: 'Who can apply to CarePath Training Institute programmes?',
    answer: 'Our certificate programmes are open to national and international applicants who hold at least an A2 (secondary school) certificate in any field, as well as graduates of accredited institutions who want to pursue health and social care studies. Postgraduate pathways require a relevant first qualification, which the admissions office verifies during review.',
  },
  {
    question: 'How do I apply?',
    answer: 'Complete the online application on the Application page. You move through personal information, academic information, programme selection, required documents and a final review before submitting. You receive a reference number immediately after submission.',
  },
  {
    question: 'Do I need an account before applying?',
    answer: 'An account is recommended because it keeps your details in one place and makes future applications faster. If you prefer, you can also complete the application as a guest and create an account later.',
  },
  {
    question: 'What happens after I submit my application?',
    answer: 'Your application is recorded with a unique reference number and queued for review by the admissions team. You are notified by email as soon as the status changes, and you can follow progress at any time on the Application Status page.',
  },
  {
    question: 'How do I check my application status?',
    answer: 'Open the Application Status page, enter your reference number and the email address you applied with, and your current status is displayed with a step-by-step timeline, from submitted through review to the final decision.',
  },
  {
    question: 'Which documents do I need?',
    answer: 'Normally a copy of your national ID or passport, your academic certificates or transcripts, and a passport-size photo. The admissions team may request additional documents, such as proof of address or translated certificates, during review.',
  },
  {
    question: 'Is there an application fee?',
    answer: 'No payment is required to submit the online application. Any enrolment-related fees are confirmed in writing by the admissions office before you enrol, and you receive a reference number for every amount you are asked to pay.',
  },
  {
    question: 'When are the intakes?',
    answer: 'Applications are received throughout the year and new cohorts begin on a rolling basis. The admissions office confirms the exact start date for your cohort after your application is accepted — see the Important Dates page for the application cycle.',
  },
  {
    question: 'Can I apply for more than one programme?',
    answer: 'Yes. Each application lets you choose a first and a second preference. If you want to change or add a preference after submitting, contact the admissions office with your reference number and they will update your record.',
  },
  {
    question: 'How will I be contacted about my application?',
    answer: 'All applicants are contacted through the email address provided in the application. Keep it up to date and check your inbox (including spam) after submitting; you can also follow progress on the Application Status page.',
  },
]

export function FaqList({ items, defaultOpen = 0 }: { items: Array<{ question: string; answer: string }>; defaultOpen?: number }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="faq-list adm-faq">
      {items.map((item, index) => (
        <div className={`faq-item ${open === index ? 'open' : ''}`} key={item.question}>
          <button onClick={() => setOpen(open === index ? -1 : index)}>
            <span>{item.question}</span>
            <ChevronDown size={18} />
          </button>
          {open === index && <p>{item.answer}</p>}
        </div>
      ))}
    </div>
  )
}

/** Lists programme-specific requirements straight from the published catalogue. */
function ProgrammeRequirementList() {
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchAdmissionsProgrammes()
      .then((result) => { if (active) setProgrammes(result.programmes) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) return <div className="adm-card"><p>Loading programme requirements…</p></div>
  if (programmes.length === 0) return <div className="adm-card"><p>The programme catalogue is currently unavailable. Contact the admissions office and we will confirm the requirements for your chosen pathway.</p></div>

  return (
    <div className="adm-grid-2">
      {programmes.map((programme) => (
        <div className="adm-card" key={programme.id}>
          <span className="adm-pill alt">{programme.category}</span>
          <h3>{programme.title}</h3>
          <p><strong>Duration:</strong> {programme.duration}</p>
          {programme.requirements.length > 0 ? (
            <ul className="check-list" style={{ margin: '14px 0 0' }}>
              {programme.requirements.map((requirement) => <li key={requirement}><CheckCircle2 /> {requirement}</li>)}
            </ul>
          ) : (
            <p style={{ marginTop: 10 }}>Detailed requirements for this programme are confirmed by the admissions office during review. The general requirements below apply to all applicants.</p>
          )}
        </div>
      ))}
    </div>
  )
}

export function AdmissionsEntryRequirements() {
  const admissions = useSiteContent('content.admissions', ADMISSIONS_DEFAULTS)
  const requirementGroups: Array<{ icon: typeof GraduationCap; title: string; points: string[] }> = [
    {
      icon: GraduationCap,
      title: 'Certificate & undergraduate pathways',
      points: [
        'At least an A2 (secondary school) certificate in any field, or an equivalent qualification.',
        'Graduates of accredited institutions seeking a career in health and social care support.',
        'Willingness to take part in supervised practical placements in care settings.',
        'A valid national ID, or a passport for international applicants.',
      ],
    },
    {
      icon: Medal,
      title: 'Postgraduate pathways',
      points: [
        'A recognised first degree, advanced diploma or equivalent professional qualification.',
        'Relevant professional experience in health, social care or a related field.',
        'Motivation to specialise, lead teams or teach within care services.',
        'A personal statement describing your goals for the programme.',
      ],
    },
    {
      icon: Languages,
      title: 'Language & eligibility',
      points: [
        'Competence in English or Kinyarwanda: teaching and assessments are delivered in these languages.',
        'Applicants must be at least 15 years old at the time of application.',
        'International qualifications are reviewed for equivalence during the admissions review.',
        'Documents not issued in English, French or Kinyarwanda may need an official translation.',
      ],
    },
  ]

  return (
    <>
      <AdmissionsHero
        eyebrow="Admissions · Entry requirements"
        title={admissions.entryRequirements.title}
        text={admissions.entryRequirements.text}
      />
      <section className="adm-section">
        <div className="container">
          <AdmissionsSectionHead eyebrow="General requirements" title="What every applicant should prepare." text="These requirements apply across our programmes. Programme-specific requirements are confirmed in the catalogue below." />
          <div className="adm-grid-3">
            {requirementGroups.map((group) => {
              const Icon = group.icon
              return (
                <div className="adm-card" key={group.title}>
                  <Icon size={22} className="lead" />
                  <h3>{group.title}</h3>
                  <ul className="check-list" style={{ margin: '10px 0 0' }}>
                    {group.points.map((point) => <li key={point}><CheckCircle2 /> {point}</li>)}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      <section className="adm-section soft">
        <div className="container">
          <AdmissionsSectionHead eyebrow="Programme-specific requirements" title="Requirements published with each programme." text="These are read directly from the programmes the admissions office has published." />
          <ProgrammeRequirementList />
        </div>
      </section>
      <section className="adm-section">
        <div className="container">
          <div className="adm-grid-2">
            <div>
              <AdmissionsSectionHead eyebrow="Required documents" title="Prepare these documents for review." />
              <RequiredDocumentsList />
            </div>
            <div className="adm-card">
              <ClipboardCheck size={22} className="lead" />
              <h3>How documents are used</h3>
              <p>Documents are reviewed only by the admissions team and are used to verify your identity and qualifications. You can upload copies during the application, or provide them later if the team requests them.</p>
              <p>Original certificates are verified at enrolment. If your documents are in a different name or language, explain this in your personal statement so the team can help.</p>
              <Link className="card-link" to="/admissions/how-to-apply">See the full application journey <ArrowRight size={14} /></Link>
            </div>
          </div>
        </div>
      </section>
      <ApplyCTA title="Requirements checked? Start your application." />
    </>
  )
}

export function AdmissionsHowToApply() {
  const admissions = useSiteContent('content.admissions', ADMISSIONS_DEFAULTS)
  const fallbackSteps: Array<{ title: string; text: string; tip: string }> = [
    { title: 'Explore programmes', text: 'Browse the programme catalogue and compare duration, level and requirements before choosing your pathway.', tip: 'Tip: prepare a first and a second preference before you start.' },
    { title: 'Create your account or continue as a guest', text: 'Sign in or create a free account so your details are saved, or continue as a guest and add an account later.', tip: 'Tip: an account lets you track every application in one place.' },
    { title: 'Personal information', text: 'Tell us who you are: name, contact details, date of birth and address. Accuracy here matters — this is how the team reaches you.', tip: 'Tip: use the email address you check most often.' },
    { title: 'Academic information', text: 'Add your highest qualification, the institution and your graduation year, plus your strongest language of study.', tip: 'Tip: if certificates are in another name, note this in your personal statement.' },
    { title: 'Programme selection', text: 'Search and filter the catalogue, review the requirements shown for each programme, then choose a first and an optional second preference.', tip: 'Tip: you can see entry requirements without leaving the page.' },
    { title: 'Required documents', text: 'Confirm the documents you have ready and, when available, upload copies of your ID, certificates and photograph.', tip: 'Tip: uploads are optional — documents can follow if the team requests them.' },
    { title: 'Review, submit and track', text: 'Check the summary, confirm your declaration and submit. You receive a reference number instantly and can follow your progress on the status page.', tip: 'Tip: save your reference number — you will use it for every follow-up.' },
  ]
  const steps = admissions.howToApply.steps.length ? admissions.howToApply.steps : fallbackSteps

  return (
    <>
      <AdmissionsHero
        eyebrow="Admissions · How to apply"
        title={admissions.howToApply.title}
        text={admissions.howToApply.text}
      />
      <section className="adm-section">
        <div className="container">
          <AdmissionsSectionHead eyebrow="The application journey" title="Seven clear steps." text="Each step validates your information before you continue, so nothing is lost and nothing invalid is submitted." />
          <div className="adm-steps">
            {steps.map((step, index) => (
              <div className="adm-step-row" key={step.title}>
                <span className="adm-step-num">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <p><small className="hint">{step.tip}</small></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="adm-section soft tight">
        <div className="container">
          <div className="adm-grid-3">
            <div className="adm-card">
              <FileText size={22} className="lead" />
              <h3>Save as you go</h3>
              <p>Your application is stored as a draft on your device while you work. You can close the page and continue later.</p>
            </div>
            <div className="adm-card">
              <ShieldCheck size={22} className="lead" />
              <h3>Validated forms</h3>
              <p>Email, phone and required fields are checked before each step is accepted, so your application arrives complete.</p>
            </div>
            <div className="adm-card">
              <NotebookPen size={22} className="lead" />
              <h3>A reference you can track</h3>
              <p>Every submitted application gets a reference number that works on the Application Status page.</p>
            </div>
          </div>
        </div>
      </section>
      <ApplyCTA />
    </>
  )
}

export function AdmissionsImportantDates() {
  const admissions = useSiteContent('content.admissions', ADMISSIONS_DEFAULTS)
  const cycleIcons = [CalendarDays, ListChecks, Info, HeartPulse]
  const fallbackCycle: Array<{ icon: typeof CalendarDays; label: string; value: string; detail: string }> = [
    { icon: CalendarDays, label: 'Applications', value: 'Open year-round', detail: 'Applications are received continuously and reviewed in the order they are submitted.' },
    { icon: ListChecks, label: 'Review', value: 'As soon as you submit', detail: 'The admissions team begins reviewing your application right after submission.' },
    { icon: Info, label: 'Decision', value: 'Communicated by email', detail: 'You are notified by email as soon as a decision is made — you can also check the status page at any time.' },
    { icon: HeartPulse, label: 'Cohort start', value: 'Rolling intakes', detail: 'New cohorts begin on a rolling basis. The admissions office confirms your exact start date after acceptance.' },
  ]
  const cycle = admissions.importantDates.items.length
    ? admissions.importantDates.items.map((item, i) => ({ icon: cycleIcons[i % cycleIcons.length], label: item.label, value: item.value, detail: item.detail }))
    : fallbackCycle
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchAdmissionsProgrammes()
      .then((result) => { if (active) setProgrammes(result.programmes) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <>
      <AdmissionsHero
        eyebrow="Admissions · Important dates"
        title={admissions.importantDates.title}
        text={admissions.importantDates.text}
      />
      <section className="adm-section">
        <div className="container">
          <AdmissionsSectionHead eyebrow="The cycle" title="What happens, and when." text="Rolling admissions means there is no single deadline to wait for — the key dates are the ones the admissions office confirms with you personally." />
          <div className="adm-card" style={{ padding: '10px 0' }}>
            {cycle.map((row) => {
              const Icon = row.icon
              return (
                <div className="adm-date-row" key={row.label}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <Icon size={19} className="lead" />
                    <span>
                      <strong>{row.label}</strong>
                      <small>{row.detail}</small>
                    </span>
                  </div>
                  <span className="adm-pill alt">{row.value}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      <section className="adm-section soft">
        <div className="container">
          <AdmissionsSectionHead eyebrow="Live programme information" title="Programme durations in the current catalogue." text="Read directly from the programmes published by the admissions office." />
          {loading ? (
            <div className="adm-card"><p>Loading programme durations…</p></div>
          ) : programmes.length === 0 ? (
            <div className="adm-card"><p>The catalogue is currently unavailable. Contact the admissions office for the current programme calendar.</p></div>
          ) : (
            <div className="adm-card" style={{ padding: '10px 0' }}>
              {programmes.map((programme) => (
                <div className="adm-date-row" key={programme.id}>
                  <div>
                    <strong>{programme.title}</strong>
                    <small>{programme.category}</small>
                  </div>
                  <span className="adm-pill alt">{programme.duration}</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ marginTop: 22, maxWidth: 720 }}>
            Exact cohort start dates are confirmed by the admissions office after acceptance — by email, and with updates on your application status page. Keep your contact details up to date so nothing reaches you late.
          </p>
        </div>
      </section>
      <ApplyCTA title="Dates sorted — ready when you are." />
    </>
  )
}

export function AdmissionsFAQPage() {
  const admissions = useSiteContent('content.admissions', ADMISSIONS_DEFAULTS)
  const faqItems = admissions.faq.items.length ? admissions.faq.items : admissionsFaqs
  return (
    <>
      <AdmissionsHero
        eyebrow="Admissions · FAQ"
        title={admissions.faq.title}
        text={admissions.faq.text}
      />
      <section className="adm-section">
        <div className="container narrow">
          <FaqList items={faqItems} />
          <div className="adm-faq-cta">
            <Link className="button button-primary" to="/admissions/apply">Start your application <ArrowRight size={16} /></Link>
            <Link className="button button-dark" to="/contact">Ask the admissions team</Link>
          </div>
        </div>
      </section>
      <section className="adm-section soft tight">
        <div className="container">
          <div className="adm-grid-3">
            <div className="adm-card">
              <BookOpen size={22} className="lead" />
              <h3>Compare programmes</h3>
              <p>Duration, level and requirements for every published programme, in one catalogue.</p>
              <Link className="card-link" to="/admissions/undergraduate">Browse the catalogue <ArrowRight size={14} /></Link>
            </div>
            <div className="adm-card">
              <BadgeCheck size={22} className="lead" />
              <h3>Check your status</h3>
              <p>Already applied? Follow your application with the reference number from your submission.</p>
              <Link className="card-link" to="/admissions/status">Application status <ArrowRight size={14} /></Link>
            </div>
            <div className="adm-card">
              <CalendarDays size={22} className="lead" />
              <h3>Plan your intake</h3>
              <p>Understand how rolling admissions and cohort start dates work before you apply.</p>
              <Link className="card-link" to="/admissions/important-dates">Important dates <ArrowRight size={14} /></Link>
            </div>
          </div>
          <p style={{ marginTop: 26, color: '#8ba0a3', fontSize: 12 }}>Last reviewed {formatAdmissionDate(new Date().toISOString())}</p>
        </div>
      </section>
      <ApplyCTA />
    </>
  )
}
