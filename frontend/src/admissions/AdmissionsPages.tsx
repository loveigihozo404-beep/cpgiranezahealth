import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, FileText, GraduationCap, IdCard, Languages, MapPin, Medal, Search, Users } from 'lucide-react'
import { fetchAdmissionsProgrammes } from './admissionsApi'
import { AdmissionsHelpBand, AdmissionsHero, AdmissionsSectionHead, ApplyCTA, ProgrammeCatalogue, RequiredDocumentsList } from './AdmissionsShared'
import { admissionsFaqs, FaqList } from './AdmissionsInfo'
import { ADMISSIONS_DEFAULTS, useSiteContent } from '../lib/siteContent'

function useProgrammeCount(): number | null {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let active = true
    fetchAdmissionsProgrammes()
      .then((result) => { if (active) setCount(result.programmes.length) })
      .catch(() => { /* The catalogue components surface load errors. */ })
    return () => { active = false }
  }, [])
  return count
}

export function AdmissionsLanding() {
  const admissions = useSiteContent('content.admissions', ADMISSIONS_DEFAULTS)
  const programmeCount = useProgrammeCount()

  const quickLinks = [
    { icon: ClipboardCheck, title: 'Start an application', text: 'Complete the guided online application and receive your reference number.', to: '/admissions/apply', action: 'Apply now' },
    { icon: Search, title: 'Check your status', text: 'Track an existing application with your reference number and email.', to: '/admissions/status', action: 'Check status' },
    { icon: BadgeCheck, title: 'Entry requirements', text: 'See what you need for certificate, undergraduate and postgraduate pathways.', to: '/admissions/entry-requirements', action: 'View requirements' },
    { icon: CalendarDays, title: 'Important dates', text: 'Understand rolling admissions, review timelines and cohort start dates.', to: '/admissions/important-dates', action: 'See the cycle' },
  ]

  const journey = [
    { title: 'Explore programmes', text: 'Compare published programmes, levels and requirements in the catalogue.' },
    { title: 'Apply online', text: 'Personal and academic details, programme choices and documents — in one guided form.' },
    { title: 'Receive your reference', text: 'A unique reference number is issued the moment you submit.' },
    { title: 'Review & decision', text: 'The admissions team reviews your file and contacts you by email.' },
    { title: 'Enrol & begin', text: 'Accepted applicants receive intake details and join the next cohort.' },
  ]

  const entryHighlights = [
    { icon: GraduationCap, title: 'Certificate & diploma entry', text: 'At least an A2 (secondary school) certificate in any field, or an equivalent qualification.' },
    { icon: Medal, title: 'Postgraduate entry', text: 'A recognised first degree or advanced professional qualification with relevant experience.' },
    { icon: Languages, title: 'Language & international applicants', text: 'Competence in English or Kinyarwanda. International certificates are reviewed for equivalence.' },
  ]

  const dateSummary = [
    { label: 'Applications', value: 'Open year-round' },
    { label: 'Review', value: 'Begins after submission' },
    { label: 'Cohorts', value: 'Rolling intakes' },
  ]

  return (
    <>
      <AdmissionsHero
        eyebrow="Admissions · CP Giraneza Health"
        title={admissions.overview.title}
        text={admissions.overview.text}
      >
        <div className="adm-hero-actions">
          <Link className="button button-primary" to="/admissions/apply">Apply now <ArrowRight size={17} /></Link>
          <Link className="button button-light" to="/admissions/status">Check application status <ArrowRight size={16} /></Link>
        </div>
        <div className="adm-hero-chip-row">
          <span className="adm-glass-chip"><CheckCircle2 size={15} /> Rolling admissions</span>
          <span className="adm-glass-chip"><Users size={15} /> 1:1 applicant support</span>
          <span className="adm-glass-chip"><BookOpen size={15} /> Practice-led learning</span>
        </div>
        <div className="adm-hero-panel">
          <div className="adm-hero-stat"><strong>{programmeCount === null ? '—' : programmeCount}</strong><span>Programmes published</span></div>
          <div className="adm-hero-stat"><strong>3</strong><span>Study levels</span></div>
          <div className="adm-hero-stat"><strong>2 choices</strong><span>Per application</span></div>
          <div className="adm-hero-stat"><strong>≤ 2 days</strong><span>Reply to enquiries</span></div>
        </div>
      </AdmissionsHero>

      <section className="adm-section">
        <div className="container">
          <div className="adm-grid-2" style={{ alignItems: 'center' }}>
            <div>
              <AdmissionsSectionHead
                eyebrow="Welcome to admissions"
                title="A clear, guided route into care education."
                text="CP Giraneza Health trains people to deliver safe, compassionate care. The admissions process is designed to be straightforward: you tell us about yourself, choose a programme and submit — we guide everything that follows."
              />
              <p style={{ maxWidth: 560 }}>
                Every application is reviewed by a real admissions team, and every applicant receives a reference number for tracking. If anything is unclear, our team is available before, during and after your application.
              </p>
              <div className="adm-hero-actions" style={{ marginTop: 22 }}>
                <Link className="button button-dark" to="/admissions/how-to-apply">See how to apply <ArrowRight size={16} /></Link>
              </div>
            </div>
            <div className="adm-grid-2">
              {quickLinks.map((link) => {
                const Icon = link.icon
                return (
                  <div className="adm-card lift" key={link.title}>
                    <Icon size={22} className="lead" />
                    <h3>{link.title}</h3>
                    <p>{link.text}</p>
                    <Link className="card-link" to={link.to}>{link.action} <ArrowRight size={14} /></Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="adm-section soft">
        <div className="container">
          <AdmissionsSectionHead eyebrow="Choose your pathway" title="Undergraduate and postgraduate admissions." text="Each pathway has its own entry requirements and programme catalogue. Pick the one that matches where you are today." />
          <div className="adm-grid-2">
            <article className="adm-level-card">
              <img src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=86" alt="Learners in a first aid training session" />
              <div className="adm-level-card-body">
                <span className="adm-pill">Undergraduate</span>
                <h3>Certificate and diploma pathways</h3>
                <p>For school leavers, graduates of accredited institutions and career changers who want to build a professional career in health and social care support.</p>
                <ul>
                  <li><CheckCircle2 /> Enter with an A2 (secondary school) certificate or equivalent</li>
                  <li><CheckCircle2 /> Practice-led learning with supervised placements</li>
                  <li><CheckCircle2 /> Recognised certificate on completion</li>
                </ul>
                <div className="adm-hero-actions" style={{ marginTop: 20 }}>
                  <Link className="button button-primary" to="/admissions/undergraduate">Undergraduate admissions <ArrowRight size={16} /></Link>
                </div>
              </div>
            </article>
            <article className="adm-level-card">
              <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=86" alt="Healthcare professionals reviewing patient notes" />
              <div className="adm-level-card-body">
                <span className="adm-pill alt">Postgraduate</span>
                <h3>Advanced and specialist pathways</h3>
                <p>For qualified professionals who want to specialise, lead teams or teach the next generation of care workers.</p>
                <ul>
                  <li><CheckCircle2 /> Enter with a recognised first degree or advanced qualification</li>
                  <li><CheckCircle2 /> Focused on leadership, teaching and specialist practice</li>
                  <li><CheckCircle2 /> Designed around working professionals</li>
                </ul>
                <div className="adm-hero-actions" style={{ marginTop: 20 }}>
                  <Link className="button button-dark" to="/admissions/postgraduate">Postgraduate admissions <ArrowRight size={16} /></Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="adm-section">
        <div className="container">
          <AdmissionsSectionHead eyebrow="How it works" title="Five steps from application to enrolment." text="The online application handles the details; the admissions team handles the decisions and stays in touch at every stage." />
          <div className="adm-steps">
            {journey.map((step, index) => (
              <div className="adm-step-row" key={step.title}>
                <span className="adm-step-num">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="adm-hero-actions" style={{ marginTop: 26 }}>
            <Link className="button button-primary" to="/admissions/apply">Begin your application <ArrowRight size={16} /></Link>
            <Link className="text-link" to="/admissions/how-to-apply">Read the detailed guide <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      <section className="adm-section soft">
        <div className="container">
          <AdmissionsSectionHead eyebrow="Entry requirements" title="What you need to qualify." text="General requirements for each pathway. Programme-specific requirements are shown with every programme in the catalogue." />
          <div className="adm-grid-3">
            {entryHighlights.map((item) => {
              const Icon = item.icon
              return (
                <div className="adm-card" key={item.title}>
                  <Icon size={22} className="lead" />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              )
            })}
          </div>
          <div className="adm-hero-actions" style={{ marginTop: 24 }}>
            <Link className="button button-dark" to="/admissions/entry-requirements">Full entry requirements <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <section className="adm-section">
        <div className="container">
          <div className="adm-grid-2">
            <div>
              <AdmissionsSectionHead eyebrow="Important dates" title="Rolling admissions, year-round." text="There is no single deadline to wait for. Applications are received continuously and reviewed as they arrive." />
              <div className="adm-card" style={{ padding: '8px 0' }}>
                {dateSummary.map((row) => (
                  <div className="adm-date-row" key={row.label}>
                    <strong>{row.label}</strong>
                    <span className="adm-pill alt">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="adm-hero-actions" style={{ marginTop: 20 }}>
                <Link className="text-link" to="/admissions/important-dates">See the full admissions cycle <ArrowRight size={15} /></Link>
              </div>
            </div>
            <div>
              <AdmissionsSectionHead eyebrow="Required documents" title="Prepare these documents." text="You can upload copies during the application, or provide them later if the admissions team requests them." />
              <RequiredDocumentsList />
            </div>
          </div>
        </div>
      </section>

      <section className="adm-section soft">
        <div className="container narrow">
          <AdmissionsSectionHead eyebrow="Questions, answered" title="Admissions questions we hear most." />
          <FaqList items={(admissions.faq.items.length ? admissions.faq.items : admissionsFaqs).slice(0, 4)} />
          <div className="adm-faq-cta">
            <Link className="button button-dark" to="/admissions/faq">Read all admissions FAQs <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <AdmissionsHelpBand />
    </>
  )
}

export function AdmissionsUndergraduate() {
  const admissions = useSiteContent('content.admissions', ADMISSIONS_DEFAULTS)
  return (
    <>
      <AdmissionsHero
        eyebrow="Admissions · Undergraduate"
        title={admissions.undergraduate.title}
        text={admissions.undergraduate.text}
      />
      <section className="adm-section">
        <div className="container">
          <AdmissionsSectionHead eyebrow="Who this pathway is for" title="Built for people starting in care." />
          <div className="adm-grid-3">
            <div className="adm-card">
              <GraduationCap size={22} className="lead" />
              <h3>School leavers & career starters</h3>
              <p>If you have completed secondary education (an A2 certificate or equivalent in any field), you can apply directly for a certificate programme.</p>
            </div>
            <div className="adm-card">
              <BookOpen size={22} className="lead" />
              <h3>Career changers</h3>
              <p>Graduates of accredited institutions who want to move into health and social care support are welcome — no prior care qualification is required.</p>
            </div>
            <div className="adm-card">
              <IdCard size={22} className="lead" />
              <h3>International applicants</h3>
              <p>National and international students can apply. International certificates are reviewed for equivalence during the admissions review.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="adm-section soft">
        <div className="container">
          <AdmissionsSectionHead eyebrow="Programme catalogue" title="Undergraduate & certificate programmes." text="Search, filter and review the requirements of each published programme before you choose." />
          <ProgrammeCatalogue defaultLevel="UNDERGRADUATE" />
        </div>
      </section>
      <section className="adm-section">
        <div className="container">
          <div className="adm-grid-2" style={{ alignItems: 'start' }}>
            <div>
              <AdmissionsSectionHead eyebrow="Before you apply" title="Entry requirements at a glance." />
              <ul className="check-list">
                <li><CheckCircle2 /> At least an A2 (secondary school) certificate in any field, or an equivalent qualification.</li>
                <li><CheckCircle2 /> Competence in English or Kinyarwanda for teaching and assessment.</li>
                <li><CheckCircle2 /> A valid national ID or passport for registration.</li>
                <li><CheckCircle2 /> Willingness to take part in supervised practical placements in care settings.</li>
              </ul>
              <div className="adm-hero-actions" style={{ marginTop: 18 }}>
                <Link className="text-link" to="/admissions/entry-requirements">Full entry requirements <ArrowRight size={15} /></Link>
              </div>
            </div>
            <div className="adm-card">
              <Clock3 size={22} className="lead" />
              <h3>How long does it take?</h3>
              <p>Programme durations are set in the catalogue — for example, the Health and Social Care Assistant certificate programme runs for six months.</p>
              <p>Applications are reviewed on a rolling basis, so the fastest start comes from applying early in the intake cycle.</p>
              <Link className="card-link" to="/admissions/important-dates">See the admissions cycle <ArrowRight size={14} /></Link>
            </div>
          </div>
        </div>
      </section>
      <ApplyCTA title="Apply for undergraduate admission today." />
    </>
  )
}

export function AdmissionsPostgraduate() {
  const admissions = useSiteContent('content.admissions', ADMISSIONS_DEFAULTS)
  return (
    <>
      <AdmissionsHero
        eyebrow="Admissions · Postgraduate"
        title={admissions.postgraduate.title}
        text={admissions.postgraduate.text}
      />
      <section className="adm-section">
        <div className="container">
          <AdmissionsSectionHead eyebrow="Who this pathway is for" title="For professionals ready for the next level." />
          <div className="adm-grid-3">
            <div className="adm-card">
              <Medal size={22} className="lead" />
              <h3>Qualified professionals</h3>
              <p>Nurses, clinical officers, social workers and care professionals holding a recognised first degree or advanced qualification.</p>
            </div>
            <div className="adm-card">
              <Users size={22} className="lead" />
              <h3>Team leads & educators</h3>
              <p>Professionals moving into supervision, training or service leadership within health and social care settings.</p>
            </div>
            <div className="adm-card">
              <MapPin size={22} className="lead" />
              <h3>International professionals</h3>
              <p>International qualifications are welcome and are reviewed for equivalence by the admissions office during your application.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="adm-section soft">
        <div className="container">
          <AdmissionsSectionHead eyebrow="Programme catalogue" title="Postgraduate programmes." text="Search and filter the postgraduate pathways published by the admissions office." />
          <p className="adm-alert info" style={{ marginBottom: 22 }}>
            New postgraduate pathways are announced here as soon as they are approved. If no programmes are listed yet, register your interest with the admissions team and we will contact you when applications open.
          </p>
          <ProgrammeCatalogue defaultLevel="POSTGRADUATE" />
        </div>
      </section>
      <section className="adm-section">
        <div className="container">
          <div className="adm-grid-2" style={{ alignItems: 'start' }}>
            <div>
              <AdmissionsSectionHead eyebrow="Before you apply" title="Postgraduate entry requirements." />
              <ul className="check-list">
                <li><CheckCircle2 /> A recognised first degree, advanced diploma or equivalent professional qualification.</li>
                <li><CheckCircle2 /> Relevant professional experience in health, social care or a related field.</li>
                <li><CheckCircle2 /> A personal statement describing your goals for the programme.</li>
                <li><CheckCircle2 /> Competence in English or Kinyarwanda.</li>
              </ul>
              <div className="adm-hero-actions" style={{ marginTop: 18 }}>
                <Link className="text-link" to="/admissions/entry-requirements">Full entry requirements <ArrowRight size={15} /></Link>
              </div>
            </div>
            <div className="adm-card">
              <FileText size={22} className="lead" />
              <h3>Register your interest</h3>
              <p>Postgraduate cohorts are confirmed individually. Share your details with the admissions team and we will guide you to the right pathway and intake.</p>
              <Link className="card-link" to="/contact">Contact the admissions team <ArrowRight size={14} /></Link>
            </div>
          </div>
        </div>
      </section>
      <ApplyCTA title="Apply for postgraduate admission." />
    </>
  )
}
