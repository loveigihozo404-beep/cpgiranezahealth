function HomeEmergency() { const home = useSiteContent('content.home', HOME_DEFAULTS); return <><section className="home-emergency-hero"><div className="container home-emergency-grid"><div className="home-emergency-copy"><div className="eyebrow"><span className="eyebrow-dot" /> {home.heroEyebrow}</div><h1>{home.heroTitle}</h1><p>{home.heroText}</p><div className="hero-actions"><Link className="button button-primary" to={home.primaryCtaHref}>{home.primaryCtaLabel} <ArrowRight size={17} /></Link><Link className="button button-light" to={home.secondaryCtaHref}>{home.secondaryCtaLabel} <MessageCircle size={16} /></Link></div><div className="home-trust-row"><span><CheckCircle2 size={17} /> Practice-led learning</span><span><ShieldCheck size={17} /> Safety-first care</span></div></div><div className="home-emergency-image"><img src={home.heroImage} alt="Doctors providing emergency first aid to a patient" /><div className="home-emergency-badge"><HeartPulse size={18} /><span><strong>{home.badgeTitle}</strong><small>{home.badgeText}</small></span></div></div></div></section><section className="home-stat-strip"><div className="container home-stat-grid"><div><strong>24/7</strong><span>Emergency mindset</span></div><div><strong>4</strong><span>Learning pathways</span></div><div><strong>1:1</strong><span>Human-centred support</span></div><div><strong>CP</strong><span>Care with purpose</span></div></div></section><section className="section home-response-section"><div className="container"><SectionHeading eyebrow="Care in action" title="Prepared people make safer communities." text="From a first response to continued recovery, our work connects practical skills with compassionate decisions." /><div className="home-story-grid"><article className="home-story-card home-story-wide"><img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=88" alt="Healthcare professionals assisting a patient in a hospital" /><div><span className="kicker">Emergency response</span><h3>Training for the first critical minutes.</h3><p>Learn how to assess, respond and communicate clearly when someone needs immediate help.</p><Link className="card-link" to="/courses/advanced-first-aid">Explore first aid <ArrowRight size={15} /></Link></div></article><article className="home-story-card"><img src="https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=800&q=88" alt="Doctor listening to a patient" /><div><span className="kicker">Dignified support</span><h3>Care that sees the person.</h3><p>Support for families, patients and care professionals at every stage.</p><Link className="card-link" to="/home-care">Explore home care <ArrowRight size={15} /></Link></div></article><article className="home-story-card"><img src="https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=800&q=88" alt="Doctor preparing medical equipment" /><div><span className="kicker">Clinical confidence</span><h3>Skills you can carry forward.</h3><p>Build reliable habits through guided, practice-led learning.</p><Link className="card-link" to="/courses">View programs <ArrowRight size={15} /></Link></div></article></div></div></section><section className="home-hospital-band"><div className="container home-hospital-inner"><div><div className="eyebrow">First Aid Emergency Hospital</div><h2>Clear roles. Fast response. Better outcomes.</h2><p>A professional visual home for emergency readiness, healthcare training and the people who need help first.</p></div><Link className="button button-primary" to="/contact">Connect with CP Giraneza <ArrowRight size={17} /></Link></div></section><CTA /></> }

import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Award, Bell, BookOpen, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, Clock3, Compass, FileText, HeartPulse, Home as HomeIcon, LayoutDashboard, LogOut, Mail, Menu, MessageCircle, Phone, Search, Settings, ShieldCheck, Stethoscope, Target, UserRound, Users, X } from 'lucide-react'
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaWhatsapp, FaXTwitter } from 'react-icons/fa6'
import { ensureStudentProfile, isAdminRole, isSupabaseConfigured, supabase, getCurrentProfile, getProfileByUserId, type Profile } from './lib/supabase'
import AdminPortal from './AdminPortal'
import { PasswordField } from './components/PasswordField'
import FileUploader from './components/FileUploader'
import AiAssistant from './components/AiAssistant'
import { createPrivateFileUrl, type UploadedFile } from './lib/storage'
import { admissionsMenuLinks } from './admissions/AdmissionsShared'
import { AdmissionsLanding, AdmissionsPostgraduate, AdmissionsUndergraduate } from './admissions/AdmissionsPages'
import { AdmissionsEntryRequirements, AdmissionsFAQPage, AdmissionsHowToApply, AdmissionsImportantDates } from './admissions/AdmissionsInfo'
import AdmissionsApply from './admissions/AdmissionsApply'
import AdmissionsStatus from './admissions/AdmissionsStatus'
import { HOME_DEFAULTS, ABOUT_DEFAULTS, HOMECARE_DEFAULTS, CONTACT_DEFAULTS, FOOTER_DEFAULTS, FAQ_DEFAULTS, ENROLL_DEFAULTS, PARTNERS_DEFAULTS, BRAND_DEFAULTS, useSiteContent, type ContactContent } from './lib/siteContent'

type Course = { id: string | number; slug: string; title: string; category: string; description: string; duration: string; price: string; image: string; featured?: boolean; seats: number }

const defaultCourseImage = 'https://images.unsplash.com/photo-1576765608866-5b51046452be?auto=format&fit=crop&w=900&q=80'

type CountryOption = { code: string; name: string; dialCode: string; flag: string }

const countryOptions: CountryOption[] = [
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼' },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿' },
  { code: 'BI', name: 'Burundi', dialCode: '+257', flag: '🇧🇮' },
  { code: 'CD', name: 'DR Congo', dialCode: '+243', flag: '🇨🇩' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹' },
  { code: 'CM', name: 'Cameroon', dialCode: '+237', flag: '🇨🇲' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' }
]

const defaultCountry = countryOptions.find((country) => country.code === 'RW') ?? countryOptions[0]

const formatLocalPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
}

const formatPhoneNumber = (dialCode: string, value: string) => {
  const digits = value.replace(/\D/g, '')
  return digits ? `${dialCode}${digits}` : ''
}

function courseCategoryLabel(course: { category?: string; category_id?: string | null; course_categories?: { name?: string | null } | null }): string {
  return course.category || course.course_categories?.name || 'Learning program'
}

async function fetchPublishedPublicCourses(): Promise<Course[]> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add your project URL and anon key to load public courses.')
  }

  const { data, error } = await supabase
    .from('courses')
    .select('id,title,slug,description,duration,price,image_url,is_featured,is_published,category_id,course_categories(name,slug)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    category: courseCategoryLabel(course as { category?: string; category_id?: string | null; course_categories?: { name?: string | null } | null }),
    description: course.description,
    duration: course.duration,
    price: `RWF ${Number(course.price ?? 0).toLocaleString()}`,
    image: course.image_url || defaultCourseImage,
    featured: Boolean(course.is_featured),
    seats: 0,
  }))
}

async function fetchPublishedPublicCourse(slug: string): Promise<Course | null> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add your project URL and anon key to load the course details.')
  }

  const { data, error } = await supabase
    .from('courses')
    .select('id,title,slug,description,duration,price,image_url,is_featured,is_published,category_id,course_categories(name,slug)')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    category: courseCategoryLabel(data as { category?: string; category_id?: string | null; course_categories?: { name?: string | null } | null }),
    description: data.description,
    duration: data.duration,
    price: `RWF ${Number(data.price ?? 0).toLocaleString()}`,
    image: data.image_url || defaultCourseImage,
    featured: Boolean(data.is_featured),
    seats: 0,
  }
}

function App() {
  return <Routes><Route path="*" element={<SiteLayout />} /></Routes>
}
export default App

function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [admissionsOpen, setAdmissionsOpen] = useState(false)
  const brand = useSiteContent('brand', BRAND_DEFAULTS)
  const location = useLocation()
  const links = [['Home', '/'], ['Home Care', '/home-care'], ['Courses', '/courses'], ['Enroll', '/register'], ['Careers', '/careers'], ['About', '/about'], ['News', '/news'], ['Contact', '/contact']]
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  const closeMenus = () => { setMenuOpen(false); setAdmissionsOpen(false) }
  const admissionsRef = useRef<HTMLDivElement>(null)
  // Close the mobile menu / admissions dropdown whenever the route changes.
  useEffect(() => { setAdmissionsOpen(false) }, [location.pathname])
  // Close the admissions dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!admissionsOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (admissionsRef.current && !admissionsRef.current.contains(event.target as Node)) setAdmissionsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [admissionsOpen])
  return <div className="app-shell">
    <header className="topbar"><div className="container nav-wrap">
      <Link to="/" className="brand" onClick={closeMenus}>{brand.logoUrl ? <img className="brand-logo-img" src={brand.logoUrl} alt="CP Giraneza Health" /> : <span className="brand-mark"><HeartPulse size={21} /></span>}<span>CP <b>Giraneza</b><small>HEALTH</small></span></Link>
      <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>{links.map(([label, path]) => <Fragment key={path}>
        <Link className={isActive(path) ? 'active' : ''} to={path} onClick={closeMenus}>{label}</Link>
        {path === '/courses' && <div ref={admissionsRef} className={`nav-dropdown ${admissionsOpen ? 'open' : ''}`}>
          <button type="button" className={`nav-dropdown-trigger ${isActive('/admissions') ? 'active' : ''}`} aria-haspopup="true" aria-expanded={admissionsOpen} onClick={() => setAdmissionsOpen(!admissionsOpen)}>Admissions <ChevronDown size={15} /></button>
          <div className="nav-dropdown-menu">{admissionsMenuLinks.map(([itemLabel, itemPath]) => <Link key={itemPath} className={isActive(itemPath) ? 'active' : ''} to={itemPath} onClick={closeMenus}>{itemLabel}</Link>)}</div>
        </div>}
      </Fragment>)}</nav>
      <button className="icon-button menu-button" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
    </div></header>
    <main><Routes><Route path="/" element={<HomeEmergency />} /><Route path="/about" element={<About />} /><Route path="/vision" element={<InfoPage eyebrow="Our direction" title="A healthier future is built through capable people." text="We are shaping a culture where practical competence and compassionate care grow together." />} /><Route path="/values" element={<InfoPage eyebrow="What guides us" title="Care with clarity. Learning with purpose." text="Respect, safety, accountability and community impact guide every learning experience." />} /><Route path="/courses" element={<Courses />} /><Route path="/courses/:slug" element={<CourseDetail />} /><Route path="/home-care" element={<HomeCare />} /><Route path="/careers" element={<Careers />} /><Route path="/careers/:slug" element={<JobDetail />} /><Route path="/news" element={<News />} /><Route path="/news/:slug" element={<Article />} /><Route path="/gallery" element={<Gallery />} /><Route path="/contact" element={<Contact />} /><Route path="/faq" element={<FAQ />} /><Route path="/partnership" element={<Partnership />} /><Route path="/verify-certificate" element={<VerifyCertificate />} /><Route path="/admissions" element={<AdmissionsLanding />} /><Route path="/admissions/undergraduate" element={<AdmissionsUndergraduate />} /><Route path="/admissions/postgraduate" element={<AdmissionsPostgraduate />} /><Route path="/admissions/entry-requirements" element={<AdmissionsEntryRequirements />} /><Route path="/admissions/how-to-apply" element={<AdmissionsHowToApply />} /><Route path="/admissions/important-dates" element={<AdmissionsImportantDates />} /><Route path="/admissions/faq" element={<AdmissionsFAQPage />} /><Route path="/admissions/apply" element={<AdmissionsApply />} /><Route path="/admissions/status" element={<AdmissionsStatus />} /><Route path="/login" element={<AuthFlow mode="login" />} /><Route path="/register" element={<AuthFlow mode="register" />} /><Route path="/forgot-password" element={<AuthFlow mode="forgot" />} /><Route path="/reset-password" element={<ResetPassword />} /><Route path="/verify-email" element={<VerifyEmail />} /><Route path="/dashboard/*" element={<Dashboard />} /><Route path="/admin" element={<Admin />} /><Route path="*" element={<NotFound />} /></Routes></main>
    <SocialLinks /><Footer />
    <AiAssistant />
  </div>
}

function SectionHeading({ eyebrow, title, text, link, href }: { eyebrow: string; title: string; text: string; link?: string; href?: string }) { return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{text}</p></div>{link && href && <Link className="text-link heading-link" to={href}>{link} <ArrowRight size={16} /></Link>}</div> }
function CourseCard({ course }: { course: Course }) { return <article className="course-card"><div className="course-image"><img src={course.image} alt={course.title} />{course.featured && <span className="badge">Featured</span>}</div><div className="course-content"><span className="kicker">{course.category}</span><h3>{course.title}</h3><p>{course.description}</p><div className="course-meta"><span><Clock3 size={15} /> {course.duration}</span><span>{course.price}</span></div><Link className="card-link" to={`/courses/${course.slug}`}>View program <ArrowRight size={15} /></Link></div></article> }
function About() { const about = useSiteContent('content.about', ABOUT_DEFAULTS); return <><InfoPage eyebrow={about.eyebrow} title={about.title} text={about.text} image={about.image || undefined} values={about.values} />{(about.mission || about.vision) && <section className="section"><div className="container"><div className="about-mv-grid">{about.mission && <article className="about-mv-card"><span className="about-mv-icon"><Compass size={24} /></span><h3>Our mission</h3><p>{about.mission}</p></article>}{about.vision && <article className="about-mv-card"><span className="about-mv-icon"><Target size={24} /></span><h3>Our vision</h3><p>{about.vision}</p></article>}</div></div></section>}{about.leadership.length > 0 && <section className="section soft"><div className="container"><div className="section-heading"><div><div className="eyebrow">Leadership &amp; team</div><h2>The people guiding our care.</h2></div></div><div className="leadership-grid">{about.leadership.map((person) => <div className="leadership-card" key={person.name}><span className="leadership-avatar"><UserRound size={22} /></span><strong>{person.name}</strong><small>{person.role}</small></div>)}</div></div></section>}</> }
function InfoPage({ eyebrow, title, text, image, values }: { eyebrow: string; title: string; text: string; image?: string; values?: Array<{ title: string; text: string }> }) { const valueIcons = [Stethoscope, HeartPulse, Award]; const items = values && values.length ? values : [{ title: 'Practical excellence', text: 'Learning designed around confident decisions, clear communication and safe routines.' }, { title: 'Human at the centre', text: 'Every learner, client and family deserves patience, dignity and respect.' }, { title: 'Visible progress', text: 'Trackable learning pathways that help people keep moving forward.' }]; return <PageIntro eyebrow={eyebrow} title={title} text={text}>{image && <img className="wide-page-image" src={image} alt="Healthcare learning in practice" />}<div className="values-grid">{items.map((value, i) => { const Icon = valueIcons[i % valueIcons.length]; return <div key={value.title}><Icon /><h3>{value.title}</h3><p>{value.text}</p></div> })}</div></PageIntro> }
function PageIntro({ eyebrow, title, text, children, variant = '' }: { eyebrow: string; title: string; text: string; children?: React.ReactNode; variant?: string }) { return <section className={`page-intro ${variant}`}><div className="container narrow"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="lead">{text}</p>{children}</div></section> }
function Courses() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All programs')
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    fetchPublishedPublicCourses()
      .then((courses) => {
        if (active) setAvailableCourses(courses)
      })
      .catch((err) => {
        if (active) {
          setAvailableCourses([])
          setError(err instanceof Error ? err.message : 'Unable to load public courses.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  const categories = ['All programs', ...new Set(availableCourses.map((course) => course.category))]
  const filtered = availableCourses.filter((course) => {
    const matchesCategory = category === 'All programs' || course.category === category
    const haystack = `${course.title} ${course.description} ${course.category}`.toLowerCase()
    return matchesCategory && haystack.includes(query.toLowerCase())
  })

  return <>
    <PageIntro variant="courses-intro" eyebrow="Learning pathways" title="Programs that move with your ambition." text="Choose a focused pathway, build practical confidence and keep growing with CP Giraneza Health." />
    <section className="section courses-section">
      <div className="container">
        <div className="catalog-summary">
          <div><span className="catalog-pill">All programs</span><h2>Explore every learning pathway</h2></div>
          <div className="catalog-metrics">
            <span><strong>{availableCourses.length}</strong> courses</span>
            <span><strong>{new Set(availableCourses.map((course) => course.category)).size}</strong> categories</span>
          </div>
        </div>

        <div className="filter-bar">
          <label className="search-field">
            <Search size={18} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search programs" />
          </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>

        {loading ? <div className="admin-empty"><p>Loading courses…</p></div> : error ? <div className="admin-empty"><p>{error}</p></div> : filtered.length === 0 ? <EmptyState text="No programs match that search." /> : <div className="course-grid">{filtered.map((course) => <CourseCard key={String(course.id)} course={course} />)}</div>}
      </div>
    </section>
  </>
}
function CourseDetail() {
  const { slug = '' } = useParams()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchPublishedPublicCourse(slug).then(result => {
      if (active) setCourse(result)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [slug])

  if (loading) return <section className="page-intro"><div className="container narrow"><p>Loading program details…</p></div></section>
  if (!course) return <NotFound />

  return <><section className="detail-hero"><div className="container detail-grid"><div><span className="kicker">{course.category}</span><h1>{course.title}</h1><p>{course.description}</p><div className="detail-stats"><span><Clock3 /> {course.duration}</span><span><Users /> {course.seats || '—'} seats</span><span><Award /> Certificate</span></div><Link className="button button-primary" to="/register">Start enrollment <ArrowRight size={16} /></Link></div></div></section><section className="section"><div className="container content-grid"><div><div className="eyebrow">What you will learn</div><h2>Practical knowledge, clearly taught.</h2><p>Work through guided instruction, scenarios and reflection designed to help you use new skills responsibly. Course content and schedules are managed by your CP Giraneza Health team.</p><ul className="check-list"><li><CheckCircle2 /> Core principles and safe practice</li><li><CheckCircle2 /> Guided scenario-based learning</li><li><CheckCircle2 /> Completion certificate pathway</li></ul></div><aside className="info-panel"><span className="kicker">Program details</span><div><small>Investment</small><strong>{course.price}</strong></div><div><small>Next schedule</small><strong>Available soon</strong></div><div><small>Location</small><strong>Kigali / Online</strong></div><Link className="button button-dark full" to="/contact">Ask a question</Link></aside></div></section></>
}
async function insertPublicRecord(table: 'homecare_requests' | 'contact_messages' | 'partnership_requests', payload: Record<string, string>) {
  if (!supabase || !isSupabaseConfigured) throw new Error('This service is temporarily unavailable. Please try again later.')
  const { error } = await supabase.from(table).insert(payload as never)
  if (error) throw error
}
type HomeCareServiceItem = { id: string; name: string; description: string }
async function fetchActiveHomecareServices(): Promise<HomeCareServiceItem[]> {
  if (!supabase || !isSupabaseConfigured) return []
  const { data, error } = await supabase.from('homecare_services').select('id, name, description').eq('is_active', true).order('name')
  if (error) return []
  return ((data as HomeCareServiceItem[] | null) ?? []).map((row) => ({ id: row.id, name: row.name, description: row.description }))
}
function HomeCare() {
  const [sent, setSent] = useState(false)
  const homecare = useSiteContent('content.homecare', HOMECARE_DEFAULTS)
  const [dbServices, setDbServices] = useState<HomeCareServiceItem[]>([])
  useEffect(() => { let active = true; fetchActiveHomecareServices().then((rows) => { if (active) setDbServices(rows) }); return () => { active = false } }, [])
  const services = dbServices.length ? dbServices.map((row, i) => ({ title: row.name, text: row.description || homecare.serviceNote, n: `0${i + 1}` })) : homecare.services.map((title, i) => ({ title, text: homecare.serviceNote, n: `0${i + 1}` }))
  return <><PageIntro eyebrow={homecare.eyebrow} title={homecare.title} text={homecare.text} /><section className="section"><div className="container"><div className="service-grid">{services.map((s) => <div className="service-card" key={s.title}><span className="service-number">{s.n}</span><HeartPulse size={21} /><h3>{s.title}</h3><p>{s.text}</p></div>)}</div><div className="form-panel"><div><div className="eyebrow">{homecare.formEyebrow}</div><h2>{homecare.formTitle}</h2><p>{homecare.formText}</p></div>{sent ? <div className="success-message"><CheckCircle2 /><strong>Request received</strong><span>Thank you. A member of our team will contact you soon.</span></div> : <SimpleForm onSubmit={async data => { await insertPublicRecord('homecare_requests', { name: String(data.get('Your name') ?? ''), email: String(data.get('Email address') ?? ''), phone: String(data.get('Phone number') ?? ''), preferred_date: String(data.get('Preferred date') ?? ''), location: String(data.get('Location') ?? ''), message: String(data.get('How can we help?') ?? '') }); setSent(true) }} button="Request support" fields={['Your name', 'Email address', 'Phone number', 'Preferred date', 'Location', 'How can we help?']} />}</div></div></section></>
}
type CareerItem = { slug: string; title: string; department: string; location: string; employment_type: string; summary: string; heading: string; description: string; requirements: string[] }
const careerRoles: CareerItem[] = [
  { slug: 'job-1', title: 'Healthcare Training Facilitator', department: 'Programs', location: 'Kigali', employment_type: 'Full time', summary: 'Help learners translate knowledge into confident, compassionate action.', heading: 'Support people with practical, compassionate care.', description: 'Support program delivery, learner feedback and the continuous improvement of practical training experiences.', requirements: ['Relevant healthcare experience', 'Thoughtful facilitation', 'A genuine interest in developing people'] },
  { slug: 'job-2', title: 'Home Care Coordinator', department: 'Operations', location: 'Kigali', employment_type: 'Full time', summary: 'Coordinate dependable, dignified support for clients and their families.', heading: 'Make every home-care experience feel supported.', description: 'Coordinate schedules, client communication and care-team follow-up so families receive a calm, dependable service.', requirements: ['Strong organization', 'Clear communication', 'Experience supporting people in a care or community setting'] },
  { slug: 'job-3', title: 'Community Outreach Associate', department: 'Community', location: 'Kigali', employment_type: 'Full time', summary: 'Build trusted relationships that connect communities with better care.', heading: 'Bring useful health learning closer to people.', description: 'Develop community relationships, support outreach events and help more people discover practical training and home-care support.', requirements: ['A confident communicator', 'Community insight and initiative', 'A strong commitment to respectful service'] }
]
async function fetchPublishedCareers(): Promise<CareerItem[]> {
  if (!supabase || !isSupabaseConfigured) return []
  const { data, error } = await supabase.from('careers').select('slug, job_title, department, location, employment_type, description, requirements').eq('is_published', true).order('created_at')
  if (error) return []
  return ((data as Array<{ slug: string; job_title: string; department: string; location: string; employment_type: string; description: string; requirements: unknown }> | null) ?? []).map((row) => ({ slug: row.slug, title: row.job_title, department: row.department, location: row.location, employment_type: row.employment_type, summary: row.description.slice(0, 120), heading: row.job_title, description: row.description, requirements: Array.isArray(row.requirements) ? row.requirements as string[] : [] }))
}
function Careers() {
  const [roles, setRoles] = useState<CareerItem[]>(careerRoles)
  useEffect(() => { let active = true; fetchPublishedCareers().then((rows) => { if (active && rows.length) setRoles(rows) }); return () => { active = false } }, [])
  return <><PageIntro variant="careers-intro" eyebrow="Careers" title="Bring your care, curiosity and craft." text="Join a growing team helping people build stronger skills and more supported lives." /><section className="section"><div className="container"><div className="job-list">{roles.map((role) => <Link className="job-row" to={`/careers/${role.slug}`} key={role.slug}><span><span className="kicker">{role.department}</span><h3>{role.title}</h3><small>{role.location} · {role.employment_type}</small></span><ArrowRight /></Link>)}</div></div></section></>
}
function JobDetail() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resumeFile, setResumeFile] = useState<UploadedFile | null>(null)
  const [applicationId] = useState(() => crypto.randomUUID())
  const { slug } = useParams()
  const [dbRole, setDbRole] = useState<CareerItem | null>(null)
  useEffect(() => { let active = true; fetchPublishedCareers().then((rows) => { const match = rows.find((row) => row.slug === slug); if (active && match) setDbRole(match) }); return () => { active = false } }, [slug])
  const role = dbRole ?? careerRoles.find((item) => item.slug === slug) ?? careerRoles[0]

  const submitApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (!supabase || !isSupabaseConfigured) throw new Error('Applications are temporarily unavailable. Please try again later.')
      const data = new FormData(event.currentTarget)
      const { error: applicationError } = await supabase.from('job_applications').insert({
        id: applicationId,
        full_name: String(data.get('full_name') ?? ''),
        email: String(data.get('email') ?? ''),
        phone: String(data.get('phone') ?? ''),
        resume_path: resumeFile?.path || null,
        resume_name: resumeFile?.name || null,
        resume_type: resumeFile?.type || null,
        resume_size: resumeFile?.size || null,
        cover_message: String(data.get('cover_message') ?? ''),
      } as never)
      if (applicationError) throw applicationError
      setSubmitted(true)
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit your application.')
    } finally { setSubmitting(false) }
  }

  return <>
    <PageIntro variant="career-detail-intro" eyebrow={`${role.department} · Open position`} title={role.title} text={role.summary}><div className="career-photo-reel" aria-hidden="true"><img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1800&q=88" alt="" /><img src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1800&q=88" alt="" /><img src="https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=1800&q=88" alt="" /></div></PageIntro>
    <section className="section career-detail-section">
      <div className="container career-layout">
        <div className="career-copy-card">
          <div className="eyebrow">The opportunity</div>
          <h2>{role.heading}</h2>
          <p>{role.description} We value clear communicators who are curious, dependable and committed to safe care.</p>
          <h3>What we are looking for</h3>
          <p>{Array.isArray(role.requirements) ? role.requirements.join(' ') : String(role.requirements)}</p>
          {Array.isArray(role.requirements) && role.requirements.length > 0 && <ul className="check-list">{role.requirements.map((requirement) => <li key={requirement}><CheckCircle2 /> {requirement}</li>)}</ul>}
        </div>

        <aside className="career-application-panel">
          {submitted ? (
            <div className="success-message career-success-message">
              <CheckCircle2 />
              <strong>Application sent</strong>
              <span>Thank you for your interest. Our team will review your application shortly.</span>
            </div>
          ) : (
            <form className="career-application-form" onSubmit={submitApplication}>
              <div className="career-form-heading">
                <div><span className="career-form-kicker" aria-hidden="true"></span><h2>Apply for this role</h2><p>Share your details and our team will be in touch.</p></div>
                <span className="career-form-mark"><HeartPulse size={20} /></span>
              </div>

              <div className="career-fields-grid">
                <label className="career-field">
                  <span className="career-field-icon"><UserRound size={17} /></span><span className="sr-only">Full name</span>
                  <input required name="full_name" placeholder="Full Name" type="text" aria-label="Full name" />
                </label>

                <label className="career-field">
                  <span className="career-field-icon"><HeartPulse size={17} /></span><span className="sr-only">Username</span>
                  <input placeholder="Username" type="text" aria-label="Username" />
                </label>

                <label className="career-field">
                  <span className="career-field-icon"><Mail size={17} /></span><span className="sr-only">Email address</span>
                  <input required name="email" placeholder="Email" type="email" aria-label="Email address" />
                </label>

                <label className="career-field">
                  <span className="career-field-icon"><Phone size={17} /></span><span className="sr-only">Phone number</span>
                  <input required name="phone" placeholder="Phone Number" type="tel" aria-label="Phone number" />
                </label>

                <div className="career-field career-file-field"><span className="career-field-icon"><FileText size={17} /></span><span className="sr-only">Resume or CV</span><FileUploader bucket="career-files" pathPrefix={`job-applications/${applicationId}`} value={resumeFile} accept="application/pdf,.pdf,.doc,.docx" maxBytes={10 * 1024 * 1024} label="Resume / CV (optional)" onUploaded={setResumeFile} onRemoved={() => setResumeFile(null)} /></div>

                <label className="career-field">
                  <span className="career-field-icon"><MessageCircle size={17} /></span><span className="sr-only">Cover message</span>
                  <input required name="cover_message" placeholder="Cover Message" type="text" aria-label="Cover message" />
                </label>
              </div>

              <div className="career-consent-row">
                <label className="career-consent"><input required type="checkbox" /><span>Remember me</span></label>
                <label className="career-consent"><input type="checkbox" /><span>Subscribe to updates</span></label>
              </div>

              {error && <p className="error-text">{error}</p>}
              <button className="button button-primary career-submit" type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Register'} <ArrowRight size={17} />
              </button>
            </form>
          )}
        </aside>
      </div>
    </section>
  </>
}
type NewsItem = { slug: string; title: string; category: string; excerpt: string; content: string; image_url: string | null; published_at: string | null }
async function fetchPublishedNews(): Promise<NewsItem[]> {
  if (!supabase || !isSupabaseConfigured) return []
  const { data, error } = await supabase.from('news').select('slug, title, category, excerpt, content, image_url, published_at').eq('is_published', true).order('published_at', { ascending: false })
  if (error) return []
  return (data as NewsItem[] | null) ?? []
}
const newsFallbackImg = (i: number) => `https://images.unsplash.com/photo-${['1576091160550-2173dba999ef', '1559757175-0eb30cd8c063', '1505751172876-fa1923c5c528'][i % 3]}?auto=format&fit=crop&w=800&q=80`
const newsDateLabel = (value: string | null) => value ? new Date(value).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Latest'
function News() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; fetchPublishedNews().then((rows) => { if (active) setItems(rows) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const cards: Array<{ slug: string; title: string; kicker: string; image: string }> = items.length
    ? items.map((item) => ({ slug: item.slug, title: item.title, kicker: `${item.category} · ${newsDateLabel(item.published_at)}`, image: item.image_url || newsFallbackImg(0) }))
    : ['Why practical confidence matters in care', 'A closer look at supportive home care', 'Learning that respects the learner'].map((title, i) => ({ slug: `story-${i + 1}`, title, kicker: `Insights · Sep ${10 + i}, 2026`, image: newsFallbackImg(i) }))
  return <><PageIntro eyebrow="Ideas & updates" title="What we are learning, building and sharing." text="Stories from the work of preparing people for better care." /><section className="section"><div className="container news-grid">{loading ? <div className="admin-empty"><p>Loading stories…</p></div> : cards.map((card) => <Link className="news-card" to={`/news/${card.slug}`} key={card.slug}><img src={card.image} alt="" /><div><span className="kicker">{card.kicker}</span><h3>{card.title}</h3><span className="card-link">Read story <ArrowRight size={15} /></span></div></Link>)}</div></section></>
}
const sampleArticle: NewsItem = { slug: 'story-1', title: 'Why practical confidence matters in care', category: 'Insights', excerpt: 'The best training creates room for people to think clearly when the moment gets busy.', content: 'Care is full of details. A calm handover, a clear question, an observation shared at the right time. These small acts shape how safe and supported someone feels.\n\nAt CP Giraneza Health, we design learning around these moments. The goal is not simply to remember information, but to build the confidence to notice, communicate and act responsibly.\n\n> Competence grows when practice is connected to purpose.\n\nOur programs are built to be clear, supportive and practical. That is how learning becomes something people can carry into the communities they serve.', image_url: null, published_at: null }
function Article() {
  const { slug = '' } = useParams()
  const [item, setItem] = useState<NewsItem | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    fetchPublishedNews().then((rows) => { const match = rows.find((row) => row.slug === slug); if (active) setItem(match ?? (slug === 'story-1' ? sampleArticle : null)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug])
  if (loading) return <section className="page-intro"><div className="container narrow"><p>Loading story…</p></div></section>
  if (!item) return <NotFound />
  const paragraphs = item.content.split(/\n+/).filter(Boolean)
  return <><PageIntro eyebrow={`${item.category} · ${newsDateLabel(item.published_at)}`} title={item.title} text={item.excerpt} /><section className="section"><div className="container article">{item.image_url && <img className="wide-page-image" src={item.image_url} alt="" />}{paragraphs.map((paragraph, i) => paragraph.startsWith('>') ? <blockquote key={i}>{paragraph.replace(/^>\s*/, '')}</blockquote> : <p key={i} className={i === 0 ? 'dropcap' : undefined}>{paragraph}</p>)}</div></section></>
}
function VerifyEmail() {
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')
  const client = supabase
  const configured = Boolean(client && isSupabaseConfigured)

  const resend = async () => {
    setError('')
    const email = window.localStorage.getItem('cpgh_verification_email')
    if (!configured) { setError('Authentication is not configured. Please contact support.'); return }
    if (!email) { setError('No registration email was found. Please register again.'); return }
    const { error: resendError } = await client!.auth.resend({ type: 'signup', email })
    if (resendError) setError(resendError.message)
    else setResent(true)
  }

  return <section className="auth-page confirmation-page"><div className="auth-card confirmation-card"><div className="success-message centered"><Mail /><div className="eyebrow">Email verification</div><h1>Check your email.</h1><span>We&apos;ve sent a secure verification link to your email address. Please check your inbox and verify your account to continue.</span>{error && <p className="error-text">{error}</p>}{resent && <p className="success-text">Verification email sent again.</p>}<button className="button button-primary" onClick={resend} disabled={!configured}>{resent ? 'Send again' : 'Resend verification email'}</button><Link className="text-link" to="/login">Back to login <ArrowRight size={15} /></Link></div></div></section>
}
function Gallery() { return <><PageIntro eyebrow="Gallery" title="A glimpse into learning and care." text="A growing collection of moments from our programs and community work." /><section className="section"><div className="container gallery-grid">{['photo-1576091160399-112ba8d25d1d','photo-1551076805-e1869033e561','photo-1584515933487-779824d29309','photo-1516841273335-e39b37888115','photo-1559757175-0eb30cd8c063','photo-1576091160550-2173dba999ef'].map((id, i) => <img key={id} src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`} alt={`CP Giraneza Health moment ${i + 1}`} />)}</div></section></> }
const contactTopics = ['Programs & Training', 'Home Care Support', 'Admissions', 'Certificates', 'Partnerships', 'Careers', 'General enquiry']
const partnershipTopics = ['Training & Capacity Building', 'Home Care Referrals', 'Community Outreach', 'Institutional Collaboration', 'Other']
function Contact() {
  const [sent, setSent] = useState(false)
  const contact = useSiteContent('content.contact', CONTACT_DEFAULTS)
  const socials = buildSocialLinks(contact.socials)

  return <>
    <section className="contact-page-shell">
      <div className="container contact-page-inner">
        <div className="contact-copy">
          <div className="eyebrow">Contact</div>
          <h1>Let’s start a useful conversation.</h1>
          <p>Questions about programs, partnerships or home care? Our team is ready to listen.</p>

          <div className="contact-details">
            <div><Mail /><span><small>Email us</small><strong>{contact.email}</strong></span></div>
            <div><HomeIcon /><span><small>Our base</small><strong>{contact.base}</strong></span></div>
            <div><Bell /><span><small>Response time</small><strong>{contact.responseNote}</strong></span></div>
          </div>

          <div className="social-card">
            <span className="eyebrow">Stay connected</span>
            <div className="social-links contact-socials">
              {socials.map((social) => (
                <a key={social.label} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label} title={social.label}>
                  <social.icon size={18} strokeWidth={2.1} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="contact-form-area">
          {sent ? (
            <div className="success-message contact-success">
              <CheckCircle2 />
              <strong>Message received</strong>
              <span>Thank you. We will be in touch.</span>
            </div>
          ) : (
            <div className="form-panel compact contact-form-card">
              <SimpleForm onSubmit={async data => { await insertPublicRecord('contact_messages', { name: String(data.get('Your name') ?? ''), email: String(data.get('Email address') ?? ''), phone: String(data.get('Phone number') ?? ''), subject: String(data.get('Subject') ?? ''), message: String(data.get('Message') ?? '') }); setSent(true) }} button="Send message" fields={['Your name', 'Email address', 'Phone number', 'Subject', 'Message']} selectFields={{ Subject: { placeholder: 'Choose a subject', options: contactTopics } }} />
            </div>
          )}
        </div>
      </div>
    </section>
  </>
}
function Partnership() {
  const partners = useSiteContent('content.partners', PARTNERS_DEFAULTS)
  const [sent, setSent] = useState(false)
  return <>
    <PageIntro eyebrow={partners.eyebrow} title={partners.title} text={partners.text} />
    <section className="section">
      <div className="container">
        <div className="partner-grid">
          {partners.names.map((name) => (
            <div className="partner-card" key={name}><span className="partner-monogram">{name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()}</span><strong>{name}</strong></div>
          ))}
        </div>
      </div>
    </section>
    <section className="section soft">
      <div className="container narrow">
        <div className="form-panel compact">
          <div className="eyebrow">Become a partner</div>
          <h2>Tell us how you would like to work together.</h2>
          <p>Share a few details and our team will reach out to explore the partnership.</p>
          {sent ? <div className="success-message"><CheckCircle2 /><strong>Request received</strong><span>Thank you. We will be in touch about a potential partnership.</span></div> : <SimpleForm onSubmit={async data => { await insertPublicRecord('partnership_requests', { organization_name: String(data.get('Organization name') ?? ''), contact_person: String(data.get('Contact person') ?? ''), email: String(data.get('Email address') ?? ''), partnership_type: String(data.get('Partnership type') ?? ''), message: String(data.get('Tell us about your idea') ?? '') }); setSent(true) }} button="Send partnership request" fields={['Organization name', 'Contact person', 'Email address', 'Partnership type', 'Tell us about your idea']} selectFields={{ 'Partnership type': { placeholder: 'Choose a partnership type', options: partnershipTopics } }} />}
        </div>
      </div>
    </section>
  </>
}
function FAQ() { const faqContent = useSiteContent('content.faq', FAQ_DEFAULTS); const faqs = faqContent.items; const [open, setOpen] = useState(0); return <><PageIntro eyebrow="Questions, answered" title="A clearer start." text="Find quick answers about learning, support and working with CP Giraneza Health." /><section className="section"><div className="container faq-list">{faqs.map((item, i) => <div className={`faq-item ${open === i ? 'open' : ''}`} key={item.question}><button onClick={() => setOpen(open === i ? -1 : i)}><span>{item.question}</span><ChevronDown size={18} /></button>{open === i && <p>{item.answer}</p>}</div>)}</div></section></> }
function VerifyCertificate() {
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{ found: boolean; name?: string; course?: string; date?: string } | null>(null)

  async function verify() {
    if (!code.trim()) return
    setChecking(true)
    setResult(null)
    if (!supabase) { setResult({ found: false }); setChecking(false); return }
    const { data, error } = await supabase.rpc('verify_certificate', { p_code: code.trim() })
    setChecking(false)
    const certificate = (data as { certificate_number?: string; holder_name?: string; course_title?: string; issue_date?: string }[] | null)?.[0]
    if (!error && certificate) {
      setResult({ found: true, name: certificate.holder_name, course: certificate.course_title, date: certificate.issue_date })
    } else {
      setResult({ found: false })
    }
  }

  return <><PageIntro eyebrow="Certificate verification" title="Confirm a certificate with confidence." text="Enter a certificate number or verification code to check an issued CP Giraneza Health certificate." /><section className="section"><div className="container verify-box"><ShieldCheck size={38} /><h2>Certificate lookup</h2><p>Only enter the public certificate identifier. Private learner information is not displayed.</p><div className="verify-form"><input value={code} onChange={e => setCode(e.target.value)} placeholder="Certificate number or code" onKeyDown={e => e.key === 'Enter' && verify()} /><button className="button button-primary" onClick={verify} disabled={checking}>{checking ? 'Checking…' : 'Verify'}</button></div>{result && <div className={`verify-result ${result.found ? 'valid' : 'invalid'}`}>{result.found ? <><CheckCircle2 /><strong>Certificate Verified</strong><span>Holder: {result.name} · Course: {result.course} · Issued: {result.date}</span></> : <><X /><strong>Certificate Not Found</strong><span>No valid certificate matches that code. Contact CP Giraneza Health if you believe this is an error.</span></>}</div>}</div></section></>
}
function AuthForm({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  const brand = useSiteContent('brand', BRAND_DEFAULTS)
  const enroll = useSiteContent('content.enroll', ENROLL_DEFAULTS)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [phoneLocal, setPhoneLocal] = useState('')
  const [phoneCountry, setPhoneCountry] = useState<CountryOption>(defaultCountry)
  const [phoneCountryOpen, setPhoneCountryOpen] = useState(false)
  const [phoneCountrySearch, setPhoneCountrySearch] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [diploma, setDiploma] = useState('')
  const [languages, setLanguages] = useState('')
  const [identificationNumber, setIdentificationNumber] = useState('')
  const [residence, setResidence] = useState('')
  const [address, setAddress] = useState('')
  const [country, setCountry] = useState('Rwanda')
  const [submitting, setSubmitting] = useState(false)
  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'
  const navigate = useNavigate()
  const location = useLocation()
  // Optional safe ?next= destination, used by flows such as the admissions application.
  const nextSearchParam = new URLSearchParams(location.search).get('next')
  const nextPath = nextSearchParam && nextSearchParam.startsWith('/') && !nextSearchParam.startsWith('//') ? nextSearchParam : ''

  // Close the country-code dropdown when clicking anywhere outside it.
  const phoneCountryRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!phoneCountryOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (phoneCountryRef.current && !phoneCountryRef.current.contains(event.target as Node)) setPhoneCountryOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [phoneCountryOpen])

  const filteredPhoneCountries = countryOptions.filter((countryOption) => {
    const query = phoneCountrySearch.trim().toLowerCase()
    if (!query) return true
    return countryOption.name.toLowerCase().includes(query) || countryOption.code.toLowerCase().includes(query) || countryOption.dialCode.includes(query)
  })

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const normalizedPhone = formatPhoneNumber(phoneCountry.dialCode, phoneLocal)
    if (isRegister && password !== passwordConfirmation) {
      setError('Passwords do not match.')
      setSubmitting(false)
      return
    }
    if (isRegister && !/^\+\d{8,15}$/.test(normalizedPhone)) {
      setError('Enter a valid phone number.')
      setSubmitting(false)
      return
    }
    if (isRegister && (Number(age) < 10 || Number(age) > 100 || !sex)) {
      setError('Enter a valid age and select sex.')
      setSubmitting(false)
      return
    }
    if (!supabase || !isSupabaseConfigured) {
      setSubmitting(false)
      return
    }
    try {
      const normalizedEmail = email.trim().toLowerCase()
      if (!isRegister && !isForgot) {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        if (loginError || !data.user) { setError('Invalid email or password.'); return }
        const profile = await getProfileByUserId(data.user.id)
        if (!profile) { await supabase.auth.signOut(); setError('Account profile unavailable.'); return }
        if (isAdminRole(profile.role)) { navigate('/admin', { replace: true }); return }
        navigate(nextPath || '/dashboard', { replace: true })
        return
      }
      const authResult = isRegister
        ? await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { full_name: fullName.trim(), phone: normalizedPhone.trim(), age: Number(age), sex, diploma: diploma.trim(), languages: languages.trim(), identification_number: identificationNumber.trim(), residence: residence.trim(), address: address.trim(), country: country.trim(), request_status: 'PENDING' }, emailRedirectTo: `${window.location.origin}/verify-email` } })
        : await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: `${window.location.origin}/reset-password` })
      const authError = authResult.error
      if (authError) { setError(authError.message); return }
      if (isRegister) {
        const signupData = 'data' in authResult ? authResult.data as { session: { user: { id: string } } | null } : null
        let sessionUserId = signupData?.session?.user.id

        // Projects with email confirmation enabled return no session from signup.
        // Try the same credentials so the normal setup still signs the learner in
        // immediately when confirmation is disabled.
        if (!sessionUserId) {
          const loginResult = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
          if (loginResult.error || !loginResult.data.session) {
            window.localStorage.setItem('cpgh_verification_email', normalizedEmail)
            setSubmitted(true)
            return
          }
          sessionUserId = loginResult.data.session.user.id
        }

        await ensureStudentProfile(sessionUserId)
        navigate(nextPath || '/dashboard', { replace: true })
        return
      }
      setSubmitted(true)
    } catch {
      setError('Unable to reach authentication services. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return <section className={`auth-page ${submitted ? 'confirmation-page' : ''}`}>
    {submitted ? (
      <div className="auth-shell auth-shell--confirmation">
        <div className="auth-card confirmation-card">
          <Link to="/" className="brand auth-brand">{brand.logoUrl ? <img className="brand-logo-img" src={brand.logoUrl} alt="CP Giraneza Health" /> : <span className="brand-mark"><HeartPulse size={21} /></span>}<span>CP <b>Giraneza</b><small>HEALTH</small></span></Link>
          <div className="success-message centered">
            <CheckCircle2 />
            <strong>{isForgot ? 'Check your inbox' : isRegister ? 'Check your email' : 'Welcome back'}</strong>
            <span>{isRegister ? "We've sent a verification link to your email address. Please check your inbox and verify your account to continue." : isForgot ? 'If an account exists for that email, a reset link has been sent.' : 'Your secure session is ready.'}</span>
            <Link className="button button-primary" to={isRegister ? '/verify-email' : '/dashboard'}>{isRegister ? 'Continue' : 'Open dashboard'}</Link>
          </div>
        </div>
      </div>
    ) : (
      <div className={`auth-shell ${isRegister ? 'auth-shell--register' : 'auth-shell--simple'}`}>
        {isRegister && (
          <aside className="auth-visual-panel">
            <div className="auth-panel-brand">
              <Link to="/" className="brand auth-brand">{brand.logoUrl ? <img className="brand-logo-img" src={brand.logoUrl} alt="CP Giraneza Health" /> : <span className="brand-mark"><HeartPulse size={21} /></span>}<span>CP <b>Giraneza</b><small>HEALTH</small></span></Link>
            </div>
            <div className="auth-visual-content">
              <div className="auth-kicker">Trusted healthcare access</div>
              <h1>Create your account</h1>
              <p>Join CP Giraneza Health today and access quality healthcare services with ease.</p>
              <div className="auth-benefit-list">
                <div className="auth-benefit-item"><ShieldCheck size={18} /><span>Secure &amp; Private</span></div>
                <div className="auth-benefit-item"><Stethoscope size={18} /><span>Quality Care</span></div>
                <div className="auth-benefit-item"><Clock3 size={18} /><span>24/7 Access</span></div>
              </div>
            </div>
            <div className="auth-visual-footer">
              <strong>Your health, our priority</strong>
              <span>We are committed to providing compassionate and quality care.</span>
            </div>
          </aside>
        )}

        {!isRegister && (
          <div className="auth-card login-card">
            <div className="login-heading">{isForgot ? 'Reset your password' : 'Sign in to your account'}</div>
            {!isSupabaseConfigured && <div className="error-text" role="status">Authentication is unavailable until Supabase is connected. Add `frontend/.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart Vite.</div>}
            <form onSubmit={submit} className="login-form">
              {!isForgot && <label className="login-field"><span>Email address</span><input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email address" /></label>}
              {isForgot && <label className="login-field"><span>Email address</span><input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email address" /></label>}
              {!isForgot && <label className="login-field"><span>Password</span><PasswordField required minLength={8} value={password} onChange={setPassword} placeholder="Password" label="Password" autoComplete="current-password" /></label>}
              {!isRegister && !isForgot && <div className="login-row"><label className="remember-box"><input type="checkbox" /><span>Remember me</span></label><Link to="/forgot-password" className="login-link">Forgot Password?</Link></div>}
              {error && <p className="error-text">{error}</p>}
              <button className="button login-button" type="submit" disabled={submitting || !isSupabaseConfigured}>{!isSupabaseConfigured ? 'Connect Supabase first' : submitting ? 'Please wait…' : isRegister ? 'Create account' : isForgot ? 'Send reset link' : 'Login'} <ArrowRight size={16} /></button>
              {mode === 'login' && <div className="login-meta"><Link to="/register">Create account</Link></div>}
              {mode === 'forgot' && <div className="login-meta"><Link to="/login">Back to login</Link></div>}
            </form>
          </div>
        )}

        {isRegister && (
          <div className="auth-card auth-register-card">
            <div className="auth-card-header">
              <div className="auth-welcome-banner">
                <span className="auth-welcome-eyebrow">{enroll.welcomeEyebrow}</span>
                <h1 className="auth-welcome-title">{enroll.welcomeTitle}</h1>
                <p className="auth-welcome-text">{enroll.welcomeText}</p>
              </div>
              <span className="auth-security-pill"><ShieldCheck size={14} /> Your information is secure</span>
              <h2>Create your account</h2>
              <p>Fill in the information below to get started.</p>
            </div>
            {!isSupabaseConfigured && <div className="error-text" role="status">Authentication is unavailable until Supabase is connected. Add `frontend/.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart Vite.</div>}
            <form onSubmit={submit} className="register-form">
              <div className="register-form-section">
                <div className="auth-section-header"><span>01</span><h3>Personal Information</h3></div>
                <div className="auth-field-grid auth-field-grid--2">
                  <label className="auth-field"><span>Full name</span><input required value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Full name" /></label>
                  <label className="auth-field auth-field--phone">
                    <span>Phone number</span>
                    <div className="auth-phone-field" aria-label="Phone number input">
                      <div className="auth-phone-select-wrap" ref={phoneCountryRef}>
                        <button type="button" className="auth-country-button" aria-expanded={phoneCountryOpen} aria-haspopup="listbox" onClick={() => setPhoneCountryOpen(!phoneCountryOpen)}>
                          <span className="auth-country-flag">{phoneCountry.flag}</span>
                          <span className="auth-country-name">{phoneCountry.name}</span>
                          <span className="auth-country-dial">{phoneCountry.dialCode}</span>
                          <ChevronDown size={14} className="auth-country-caret" />
                        </button>
                        {phoneCountryOpen && (
                          <div className="auth-country-menu" role="listbox" aria-label="Select a country code">
                            <div className="auth-country-search-wrap">
                              <Search size={14} />
                              <input
                                value={phoneCountrySearch}
                                onChange={(event) => setPhoneCountrySearch(event.target.value)}
                                placeholder="Search country or code"
                                aria-label="Search country"
                              />
                            </div>
                            <div className="auth-country-options">
                              {filteredPhoneCountries.map((countryOption) => (
                                <button
                                  key={countryOption.code}
                                  type="button"
                                  className={`auth-country-option${countryOption.code === phoneCountry.code ? ' selected' : ''}`}
                                  onClick={() => {
                                    setPhoneCountry(countryOption)
                                    setPhoneCountryOpen(false)
                                    setPhoneCountrySearch('')
                                  }}
                                >
                                  <span>{countryOption.flag}</span>
                                  <span className="auth-country-label">{countryOption.name}</span>
                                  <span className="auth-country-code">{countryOption.dialCode}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        required
                        type="tel"
                        value={phoneLocal}
                        onChange={(event) => setPhoneLocal(formatLocalPhoneNumber(event.target.value))}
                        placeholder={phoneCountry.code === 'RW' ? '78X XXX XXX' : 'Phone number'}
                        aria-label="Phone number"
                      />
                    </div>
                  </label>
                  <label className="auth-field"><span>Age</span><input required type="number" min="10" max="100" value={age} onChange={event => setAge(event.target.value)} placeholder="Age" /></label>
                  <label className="auth-field"><span>Sex</span><select required value={sex} onChange={event => setSex(event.target.value)}><option value="">Select sex</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></select></label>
                </div>
              </div>

              <div className="register-form-section">
                <div className="auth-section-header"><span>02</span><h3>Professional Information</h3></div>
                <div className="auth-field-grid auth-field-grid--2">
                  <label className="auth-field"><span>Highest diploma</span><select required value={diploma} onChange={event => setDiploma(event.target.value)}><option value="">Select diploma</option><option value="PRIMARY">Primary education</option><option value="SECONDARY">Secondary education</option><option value="DIPLOMA">Healthcare diploma</option><option value="BACHELOR">Bachelor degree</option><option value="MASTER">Master degree</option><option value="OTHER">Other qualification</option></select></label>
                  <label className="auth-field"><span>Primary language</span><select required value={languages} onChange={event => setLanguages(event.target.value)}><option value="">Select language</option><option value="KINYARWANDA">Kinyarwanda</option><option value="ENGLISH">English</option><option value="FRENCH">French</option><option value="OTHER">Other language</option></select></label>
                </div>
              </div>

              <div className="register-form-section">
                <div className="auth-section-header"><span>03</span><h3>Identification</h3></div>
                <div className="auth-field-grid auth-field-grid--2">
                  <label className="auth-field auth-field--full"><span>National ID or passport</span><input required value={identificationNumber} onChange={event => setIdentificationNumber(event.target.value)} placeholder="National ID or passport" /></label>
                  <label className="auth-field"><span>Residence</span><select required value={residence} onChange={event => setResidence(event.target.value)}><option value="">Select residence</option><option value="KIGALI">Kigali City</option><option value="EASTERN">Eastern Province</option><option value="NORTHERN">Northern Province</option><option value="SOUTHERN">Southern Province</option><option value="WESTERN">Western Province</option><option value="OTHER">Outside Rwanda</option></select></label>
                  <label className="auth-field auth-field--full"><span>Address</span><textarea required value={address} onChange={event => setAddress(event.target.value)} placeholder="Full address" rows={3} /></label>
                  <label className="auth-field"><span>Country</span><select required value={country} onChange={event => setCountry(event.target.value)}><option value="Rwanda">Rwanda</option><option value="Burundi">Burundi</option><option value="DRC">Democratic Republic of Congo</option><option value="Uganda">Uganda</option><option value="Tanzania">Tanzania</option><option value="Other">Other country</option></select></label>
                </div>
              </div>

              <div className="register-form-section">
                <div className="auth-section-header"><span>04</span><h3>Account Security</h3></div>
                <div className="auth-field-grid auth-field-grid--2">
                  <label className="auth-field auth-field--full"><span>Email address</span><input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email address" /></label>
                  <label className="auth-field"><span>Password</span><PasswordField required minLength={8} value={password} onChange={setPassword} placeholder="Password" label="Password" autoComplete="new-password" /></label>
                  <label className="auth-field"><span>Confirm password</span><PasswordField required minLength={8} value={passwordConfirmation} onChange={setPasswordConfirmation} placeholder="Confirm password" label="Confirm password" autoComplete="new-password" /></label>
                </div>
              </div>

              {error && <p className="error-text">{error}</p>}

              <button className="button register-button" type="submit" disabled={submitting || !isSupabaseConfigured}>
                {!isSupabaseConfigured ? 'Connect Supabase first' : submitting ? 'Please wait…' : 'CREATE ACCOUNT →'}
              </button>

              <div className="auth-footer-text">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </form>
          </div>
        )}
      </div>
    )}
  </section>
}
function AuthFlow({ mode }: { mode: 'login' | 'register' | 'forgot' }) { return <AuthForm mode={mode} /> }
function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(false)
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!supabase) { setError('Authentication is not configured.'); return }
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) setReady(Boolean(data.session)) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setReady(Boolean(session))
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmation) { setError('Passwords do not match.'); return }
    if (!supabase || !ready) { setError('This reset link is invalid or has expired. Request a new reset link.'); return }
    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError(updateError.message)
    else setUpdated(true)
    setSubmitting(false)
  }

  return <section className="auth-page"><div className="auth-shell"><div className="login-title">CP Giraneza Health</div><div className="auth-card login-card">
    {updated ? <div className="success-message centered"><CheckCircle2 /><strong>Password updated</strong><span>Your password has been changed securely.</span><Link className="button button-primary" to="/login">Return to login <ArrowRight size={16} /></Link></div> : <><div className="login-heading">Create a new password</div><form onSubmit={submit} className="login-form">
      <label className="login-field"><span>New password</span><PasswordField required minLength={8} value={password} onChange={setPassword} placeholder="At least 8 characters" label="New password" autoComplete="new-password" /></label>
      <label className="login-field"><span>Confirm password</span><PasswordField required minLength={8} value={confirmation} onChange={setConfirmation} placeholder="Confirm password" label="Confirm password" autoComplete="new-password" /></label>
      {error && <p className="error-text">{error}</p>}
      <button className="button login-button" type="submit" disabled={submitting}>{submitting ? 'Updating…' : 'Update password'} <ArrowRight size={16} /></button>
    </form></>}
  </div></div></section>
}
type SocialLink = { label: string; href: string; icon: typeof FaInstagram }
function buildSocialLinks(socials: ContactContent['socials']): SocialLink[] {
  return [
    { label: 'Instagram', href: socials.instagram || 'https://instagram.com', icon: FaInstagram },
    { label: 'LinkedIn', href: socials.linkedin || 'https://linkedin.com', icon: FaLinkedinIn },
    { label: 'WhatsApp', href: socials.whatsapp || 'https://wa.me/250000000000', icon: FaWhatsapp },
    { label: 'Facebook', href: socials.facebook || 'https://facebook.com', icon: FaFacebookF },
    { label: 'TikTok', href: socials.tiktok || 'https://tiktok.com', icon: FaTiktok },
    { label: 'X', href: socials.x || 'https://x.com', icon: FaXTwitter }
  ]
}
function SocialLinks() { const contact = useSiteContent('content.contact', CONTACT_DEFAULTS); const links = buildSocialLinks(contact.socials); return <section className="social-strip"><div className="container social-strip-inner"><div><span className="eyebrow">Stay connected</span><strong>Care, learning and community updates.</strong></div><div className="social-links">{links.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer" aria-label={link.label} title={link.label}><link.icon /></a>)}</div></div></section> }
function Dashboard() {
  const navigate = useNavigate()
  const [authorized, setAuthorized] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)

  useEffect(() => {
    let active = true
    getCurrentProfile().then(profile => {
      if (!active) return
      if (!profile) { navigate('/login', { replace: true }); return }
      if (isAdminRole(profile.role)) { navigate('/admin', { replace: true }); return }
      setAuthorized(true)
    }).catch(() => {
      if (active) navigate('/login', { replace: true })
    }).finally(() => {
      if (active) setCheckingAccess(false)
    })

    return () => { active = false }
  }, [navigate])

  if (checkingAccess) return <section className="auth-page"><div className="auth-card"><p>Checking your secure session…</p></div></section>
  if (!authorized) return null

  return (
    <Routes>
      <Route element={<StudentDashboardLayout />}>
        <Route path="/dashboard" element={<StudentOverview />} />
        <Route path="/dashboard/profile" element={<StudentProfile />} />
        <Route path="/dashboard/courses" element={<StudentCourses />} />
        <Route path="/dashboard/enrollments" element={<StudentEnrollments />} />
        <Route path="/dashboard/schedule" element={<StudentSchedule />} />
        <Route path="/dashboard/certificates" element={<StudentCertificates />} />
        <Route path="/dashboard/notifications" element={<StudentNotifications />} />
        <Route path="/dashboard/settings" element={<StudentSettings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
function Admin() { return <AdminPortal /> }

const dashboardNav = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', to: '/dashboard/profile', icon: UserRound },
  { label: 'My Courses', to: '/dashboard/courses', icon: BookOpen },
  { label: 'My Enrollments', to: '/dashboard/enrollments', icon: ClipboardList },
  { label: 'Training Schedule', to: '/dashboard/schedule', icon: CalendarDays },
  { label: 'Certificates', to: '/dashboard/certificates', icon: Award },
  { label: 'Notifications', to: '/dashboard/notifications', icon: Bell },
  { label: 'Settings', to: '/dashboard/settings', icon: Settings },
]

function StudentDashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    let active = true
    async function loadProfile() {
      try {
        const currentProfile = await getCurrentProfile()
        if (!active) return
        setProfile(currentProfile)
        if (!supabase || !currentProfile) return
        const { data, error } = await supabase.from('notifications').select('id,read_at').eq('user_id', currentProfile.id)
        if (!error && data) setUnreadNotifications(data.filter(item => !item.read_at).length)
      } catch {
        setProfile(null)
      }
    }
    loadProfile()
    return () => { active = false }
  }, [])

  const signOut = async () => {
    await supabase?.auth.signOut()
    navigate('/login', { replace: true })
  }

  const activeNav = dashboardNav.find(item => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)) ?? dashboardNav[0]
  const page = location.pathname === '/dashboard/profile' ? <StudentProfile />
    : location.pathname === '/dashboard/courses' ? <StudentCourses />
      : location.pathname === '/dashboard/enrollments' ? <StudentEnrollments />
        : location.pathname === '/dashboard/schedule' ? <StudentSchedule />
          : location.pathname === '/dashboard/certificates' ? <StudentCertificates />
            : location.pathname === '/dashboard/notifications' ? <StudentNotifications />
              : location.pathname === '/dashboard/settings' ? <StudentSettings />
                : <StudentOverview />

  return (
    <section className="student-dashboard-page">
      <div className="student-dashboard-shell">
        <aside className={`student-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="student-sidebar-header">
            <Link className="brand student-brand" to="/" onClick={() => setSidebarOpen(false)}>
              <span className="brand-mark"><HeartPulse size={21} /></span>
              <span>CP <b>Giraneza</b><small>HEALTH</small></span>
            </Link>
            <button className="student-close-btn" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="student-sidebar-meta">Student workspace</div>
          <nav className="student-sidebar-nav">
            {dashboardNav.map(item => {
              const Icon = item.icon
              const isActive = activeNav.to === item.to
              return (
                <NavLink key={item.to} to={item.to} className={`student-nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {item.label === 'Notifications' && unreadNotifications > 0 && <em>{unreadNotifications}</em>}
                </NavLink>
              )
            })}
          </nav>
          <button className="student-logout" onClick={signOut}><LogOut size={16} /> Sign out</button>
        </aside>

        <div className="student-dashboard-main">
          <header className="student-topbar">
            <div className="student-topbar-left">
              <button className="student-mobile-trigger" aria-label="Open sidebar" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <div>
                <span className="eyebrow">Student portal</span>
                <h1>{profile?.full_name ? `Good morning, ${profile.full_name.split(' ')[0]}` : 'Student portal'}</h1>
              </div>
            </div>
            <div className="student-topbar-actions">
              <Link className="student-topbar-icon" to="/dashboard/notifications" aria-label="Notifications">
                <Bell size={18} />
                {unreadNotifications > 0 && <span className="student-badge">{unreadNotifications}</span>}
              </Link>
              <Link className="student-profile-chip" to="/dashboard/profile">
                <span className="student-avatar">{profile?.full_name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'ST'}</span>
                <span>{profile?.full_name || 'Student'}</span>
              </Link>
            </div>
          </header>

          <main className="student-content">{page}</main>
        </div>
      </div>
      {sidebarOpen && <button className="student-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    </section>
  )
}

function formatStatusLabel(value: string | null | undefined): string {
  const normalized = (value || 'NOT_STARTED').toUpperCase()
  const labels: Record<string, string> = {
    NOT_STARTED: 'Not Started',
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    PENDING: 'Pending Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    WAITLISTED: 'Waitlisted',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    ACTIVE: 'Active',
    VALID: 'Valid',
  }
  return labels[normalized] || normalized.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function firstRelation<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

function StudentOverview() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ registration: 'Not Started', review: 'Not Started', notifications: 0, enrollment: 'No active enrollment' })

  useEffect(() => {
    let active = true
    async function load() {
      try {
        if (!supabase) throw new Error('Supabase is not configured.')
        const currentProfile = await getCurrentProfile()
        if (!currentProfile) throw new Error('Your profile is unavailable. Please sign in again.')
        setProfile(currentProfile)
        const [enrollmentResult, notificationResult] = await Promise.all([
          supabase.from('enrollments').select('id,status,created_at,course_id,courses(title)').eq('student_id', currentProfile.id).order('created_at', { ascending: false }),
          supabase.from('notifications').select('id,read_at').eq('user_id', currentProfile.id)
        ])
        if (enrollmentResult.error) throw enrollmentResult.error
        if (notificationResult.error) throw notificationResult.error
        const enrollments = enrollmentResult.data ?? []
        const latestEnrollment = enrollments[0]
        const latestCourse = firstRelation(latestEnrollment?.courses)
        const unreadCount = (notificationResult.data ?? []).filter(item => !item.read_at).length
        setStats({
          registration: latestEnrollment ? formatStatusLabel(latestEnrollment.status) : 'Not Started',
          review: latestEnrollment ? formatStatusLabel(latestEnrollment.status) : 'Not Started',
          notifications: unreadCount,
          enrollment: latestEnrollment ? `${latestCourse?.title || 'Program'} · ${formatStatusLabel(latestEnrollment.status)}` : 'No active enrollment',
        })
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your dashboard.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) return <div className="student-section"><div className="student-panel"><p>Loading your student dashboard…</p></div></div>
  if (error) return <div className="student-section"><div className="student-panel student-error"><p>{error}</p></div></div>

  return (
    <div className="student-section">
      <div className="student-hero-card">
        <div>
          <span className="eyebrow">Your learning journey</span>
          <h2>Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}.</h2>
        </div>
        <Link className="button button-primary" to="/dashboard/profile">Review profile</Link>
      </div>

      <div className="student-metrics">
        <div className="student-metric-card">
          <div className="student-metric-label">Registration Status</div>
          <div className="student-metric-value">{stats.registration}</div>
          <div className="student-metric-foot">Latest application status</div>
        </div>
        <div className="student-metric-card">
          <div className="student-metric-label">Admin Review Status</div>
          <div className="student-metric-value">{stats.review}</div>
          <div className="student-metric-foot">Decision timeline</div>
        </div>
        <div className="student-metric-card">
          <div className="student-metric-label">Notifications</div>
          <div className="student-metric-value">{stats.notifications}</div>
          <div className="student-metric-foot">Unread updates</div>
        </div>
        <div className="student-metric-card">
          <div className="student-metric-label">Current Enrollment</div>
          <div className="student-metric-value student-metric-compact">{stats.enrollment}</div>
          <div className="student-metric-foot">Active learning status</div>
        </div>
      </div>

      <div className="student-columns">
        <div className="student-panel">
          <div className="student-panel-header">
            <h3>Complete your registration</h3>
            <span className="student-pill pill-primary">New</span>
          </div>
          <RegistrationPanel />
        </div>
        <div className="student-panel">
          <div className="student-panel-header">
            <h3>Recent updates</h3>
            <Link to="/dashboard/notifications">View all</Link>
          </div>
          <RecentNotifications />
        </div>
      </div>
    </div>
  )
}

function RegistrationPanel() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Array<{ id: string; title: string; description: string; duration: string; slug: string }>>([])
  const [enrollments, setEnrollments] = useState<Array<{ id: string; status: string; created_at: string; courses?: { title?: string }[] | { title?: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchData = async () => {
    if (!supabase) return
    const currentProfile = await getCurrentProfile()
    if (!currentProfile) return
    setProfile(currentProfile)

    const [coursesResult, enrollmentsResult] = await Promise.all([
      supabase.from('courses').select('id,title,description,duration,slug').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('enrollments').select('id,status,created_at,courses(title)').eq('student_id', currentProfile.id).order('created_at', { ascending: false })
    ])

    if (coursesResult.error) throw coursesResult.error
    if (enrollmentsResult.error) throw enrollmentsResult.error

    setCourses(coursesResult.data ?? [])
    setEnrollments(enrollmentsResult.data ?? [])
  }

  useEffect(() => {
    let active = true
    async function load() {
      try {
        await fetchData()
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your registration options.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !profile) return
    const formData = new FormData(event.currentTarget)
    const courseId = String(formData.get('course_id') || '')
    const note = String(formData.get('note') || '').trim()
    const phone = String(formData.get('phone') || '').trim()
    const location = String(formData.get('location') || '').trim()

    if (!courseId || !phone || !location || !note) {
      setError('Please complete the course, phone number, location and note fields.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      const { data: existing, error: existingError } = await supabase.from('enrollments').select('id').eq('student_id', profile.id).eq('course_id', courseId).in('status', ['PENDING', 'APPROVED', 'WAITLISTED']).maybeSingle()
      if (existingError) throw existingError
      if (existing) {
        setError('You already have an active registration for this course.')
        return
      }

      const { error: profileError } = await supabase.from('profiles').update({ phone, updated_at: new Date().toISOString() }).eq('id', profile.id)
      if (profileError) throw profileError

      const { error: enrollmentError } = await supabase.from('enrollments').insert({
        student_id: profile.id,
        course_id: courseId,
        status: 'PENDING',
        application_note: `Location: ${location}\n\nRegistration details: ${note}`
      })

      if (enrollmentError) throw enrollmentError

      await fetchData()
      event.currentTarget.reset()
      setSuccess('Registration submitted successfully. The admin team will review your application.')
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to submit your course registration.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="student-empty-state">Loading open courses…</p>

  return (
    <div className="student-registration-block">
      {courses.length === 0 ? (
        <p className="student-empty-state">No published courses are currently available.</p>
      ) : (
        <form className="student-form" onSubmit={handleSubmit}>
          <div className="student-form-grid">
            <label>
              <span>Full name</span>
              <input value={profile?.full_name || ''} disabled />
            </label>
            <label>
              <span>Phone</span>
              <input name="phone" type="tel" defaultValue={profile?.phone || ''} required />
            </label>
            <label>
              <span>Course</span>
              <select name="course_id" defaultValue="" required>
                <option value="" disabled>Select a course</option>
                {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </label>
            <label>
              <span>Location</span>
              <input name="location" placeholder="District or city" required />
            </label>
            <label className="student-form-wide">
              <span>Application note</span>
              <textarea name="note" rows={4} placeholder="Tell us why you want to attend this program" required />
            </label>
          </div>
          {error && <div className="student-alert error">{error}</div>}
          {success && <div className="student-alert success">{success}</div>}
          <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit enrollment'}</button>
        </form>
      )}

      {enrollments.length > 0 && (
        <div className="student-mini-list">
          <h4>Your recent applications</h4>
          {enrollments.slice(0, 3).map(item => {
            const itemCourse = firstRelation(item.courses)
            return <div className="student-mini-item" key={item.id}>
              <div>
                <strong>{itemCourse?.title || 'Program application'}</strong>
                <small>{formatDate(item.created_at)}</small>
              </div>
              <span className={`student-status-badge status-${(item.status || 'PENDING').toLowerCase()}`}>{formatStatusLabel(item.status)}</span>
            </div>
          })}
        </div>
      )}
    </div>
  )
}

function RecentNotifications() {
  const [items, setItems] = useState<Array<{ id: string; title: string; message: string; created_at: string; read_at?: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) return
      const currentProfile = await getCurrentProfile()
      if (!currentProfile) return
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', currentProfile.id).order('created_at', { ascending: false }).limit(4)
      if (!active) return
      if (!error) setItems(data ?? [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) return <p className="student-empty-state">Loading updates…</p>
  if (items.length === 0) return <p className="student-empty-state">No notifications yet.</p>

  return (
    <div className="student-notification-list">
      {items.map(item => (
        <div key={item.id} className={`student-notification-item ${item.read_at ? 'read' : 'unread'}`}>
          <strong>{item.title}</strong>
          <p>{item.message}</p>
          <small>{formatDateTime(item.created_at)}</small>
        </div>
      ))}
    </div>
  )
}

function StudentProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({ full_name: '', phone: '', address: '', country: '', residence: '', email: '' })
  const [avatarFile, setAvatarFile] = useState<UploadedFile | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const currentProfile = await getCurrentProfile()
        if (!currentProfile) throw new Error('Your profile is unavailable.')
        if (!active) return
        setProfile(currentProfile)
        setAvatarFile(currentProfile.avatar_path ? { path: currentProfile.avatar_path, name: 'Current profile photo', type: 'image/*', size: 0 } : null)
        setFormData({
          full_name: currentProfile.full_name || '',
          phone: currentProfile.phone || '',
          address: currentProfile.address || '',
          country: currentProfile.country || '',
          residence: currentProfile.residence || '',
          email: currentProfile.email || '',
        })
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your profile.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const handleChange = (field: keyof typeof formData, value: string) => setFormData(prev => ({ ...prev, [field]: value }))

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile || !supabase) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { error: updateError } = await supabase.from('profiles').update({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        country: formData.country.trim(),
        residence: formData.residence.trim(),
        avatar_path: avatarFile?.path || null,
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id)

      if (updateError) throw updateError
      setSuccess('Profile updated successfully.')
      setProfile({ ...profile, full_name: formData.full_name.trim(), phone: formData.phone.trim(), address: formData.address.trim(), country: formData.country.trim(), residence: formData.residence.trim() })
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update your profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="student-section"><div className="student-panel"><p>Loading your profile…</p></div></div>

  return (
    <div className="student-section">
      <div className="student-panel">
        <div className="student-panel-header">
          <h3>My profile</h3>
          <span className="student-pill">{profile?.role || 'STUDENT'}</span>
        </div>

        <form className="student-form" onSubmit={handleSave}>
                    <div className="profile-upload-row">
                      <div className="student-avatar student-avatar-large">{formData.full_name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'ST'}</div>
                      <div><strong>Profile photo</strong><FileUploader bucket="profile-images" pathPrefix={profile?.id || 'profile'} value={avatarFile} accept="image/jpeg,image/png,image/webp" maxBytes={5 * 1024 * 1024} onUploaded={setAvatarFile} onRemoved={() => setAvatarFile(null)} /></div>
                    </div>
          <div className="student-form-grid">
            <label><span>Full name</span><input value={formData.full_name} onChange={event => handleChange('full_name', event.target.value)} required /></label>
            <label><span>Email</span><input value={formData.email} disabled /></label>
            <label><span>Phone</span><input value={formData.phone} onChange={event => handleChange('phone', event.target.value)} /></label>
            <label><span>Country</span><input value={formData.country} onChange={event => handleChange('country', event.target.value)} /></label>
            <label><span>Residence</span><input value={formData.residence} onChange={event => handleChange('residence', event.target.value)} /></label>
            <label className="student-form-wide"><span>Address</span><textarea rows={3} value={formData.address} onChange={event => handleChange('address', event.target.value)} /></label>
          </div>
          {error && <div className="student-alert error">{error}</div>}
          {success && <div className="student-alert success">{success}</div>}
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </form>
      </div>
    </div>
  )
}

function StudentCourses() {
  const [items, setItems] = useState<Array<{ id: string; status: string; courses?: { title?: string; description?: string; duration?: string; slug?: string; image_url?: string; material_path?: string; material_name?: string; material_type?: string; material_size?: number }[] | { title?: string; description?: string; duration?: string; slug?: string; image_url?: string; material_path?: string; material_name?: string; material_type?: string; material_size?: number }; course_schedules?: { location?: string; trainer?: string; starts_at?: string; ends_at?: string }[] | { location?: string; trainer?: string; starts_at?: string; ends_at?: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState('')

  const downloadMaterial = async (itemId: string, path: string, name?: string) => {
    try {
      setDownloading(itemId)
      const url = await createPrivateFileUrl('course-files', path)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = name || 'course-material'
      anchor.target = '_blank'
      anchor.click()
    } catch (downloadError: unknown) {
      setError(downloadError instanceof Error ? downloadError.message : 'Course material download failed.')
    } finally { setDownloading('') }
  }

  useEffect(() => {
    let active = true
    async function load() {
      try {
        if (!supabase) throw new Error('Supabase is not configured.')
        const currentProfile = await getCurrentProfile()
        if (!currentProfile) throw new Error('Your profile is unavailable.')
        let { data, error: queryError } = await supabase.from('enrollments').select('id,status,created_at,courses(title,description,duration,slug,image_url,material_path,material_name,material_type,material_size),course_schedules(location,trainer,starts_at,ends_at)').eq('student_id', currentProfile.id).order('created_at', { ascending: false })
        if (queryError?.code === '42703') {
          const fallback = await supabase.from('enrollments').select('id,status,created_at,courses(title,description,duration,slug,image_url),course_schedules(location,trainer,starts_at,ends_at)').eq('student_id', currentProfile.id).order('created_at', { ascending: false })
          data = (fallback.data ?? []) as typeof data
          queryError = fallback.error
        }
        if (!active) return
        if (queryError) throw queryError
        setItems(data ?? [])
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your courses.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) return <div className="student-section"><div className="student-panel"><p>Loading your courses…</p></div></div>
  if (error) return <div className="student-section"><div className="student-panel student-error"><p>{error}</p></div></div>
  if (items.length === 0) return <div className="student-section"><div className="student-panel"><p className="student-empty-state">No courses found for your account yet.</p></div></div>

  return (
    <div className="student-section">
      <div className="student-panel">
        <div className="student-panel-header">
          <h3>My courses</h3>
          <Link to="/dashboard/enrollments">View enrollments</Link>
        </div>
        <div className="student-card-grid">
          {items.map(item => {
            const course = firstRelation(item.courses)
            const schedule = firstRelation(item.course_schedules)
            return (
              <article key={item.id} className="student-course-card">
                <div className="student-course-header">
                  <div>
                    <span className="student-course-tag">Course</span>
                    <h4>{course?.title || 'Course'}</h4>
                  </div>
                  <span className={`student-status-badge status-${(item.status || 'PENDING').toLowerCase()}`}>{formatStatusLabel(item.status)}</span>
                </div>
                <p>{course?.description || 'No description available.'}</p>
                <ul>
                  <li><strong>Duration:</strong> {course?.duration || '—'}</li>
                  <li><strong>Schedule:</strong> {schedule?.starts_at ? formatDateTime(schedule.starts_at) : '—'}</li>
                  <li><strong>Location:</strong> {schedule?.location || '—'}</li>
                  <li><strong>Trainer:</strong> {schedule?.trainer || '—'}</li>
                </ul>
                <div className="student-card-actions">
                  <Link to={course?.slug ? `/courses/${course.slug}` : '/courses'}>View course</Link>
                  <Link to="/dashboard/schedule">View schedule</Link>
                  {course?.material_path && <button type="button" className="button button-light" onClick={() => downloadMaterial(item.id, course.material_path!, course.material_name)} disabled={downloading === item.id}>{downloading === item.id ? 'Preparing…' : 'Download material'}</button>}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StudentEnrollments() {
  const [items, setItems] = useState<Array<{ id: string; status: string; created_at: string; updated_at: string; application_note?: string; courses?: { title?: string }[] | { title?: string }; course_schedules?: { location?: string }[] | { location?: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        if (!supabase) throw new Error('Supabase is not configured.')
        const currentProfile = await getCurrentProfile()
        if (!currentProfile) throw new Error('Your profile is unavailable.')
        const { data, error: queryError } = await supabase.from('enrollments').select('id,status,created_at,updated_at,application_note,courses(title),course_schedules(location)').eq('student_id', currentProfile.id).order('created_at', { ascending: false })
        if (!active) return
        if (queryError) throw queryError
        setItems(data ?? [])
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load enrollments.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) return <div className="student-section"><div className="student-panel"><p>Loading enrollments…</p></div></div>
  if (error) return <div className="student-section"><div className="student-panel student-error"><p>{error}</p></div></div>

  return (
    <div className="student-section">
      <div className="student-panel">
        <div className="student-panel-header">
          <h3>My enrollments</h3>
          <Link to="/dashboard/courses">My courses</Link>
        </div>

        {items.length === 0 ? (
          <p className="student-empty-state">No enrollments yet.</p>
        ) : (
          <div className="student-table-wrap">
            <table className="student-table">
              <thead>
                <tr><th>Course</th><th>Schedule</th><th>Application date</th><th>Status</th><th>Last updated</th></tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const itemCourse = firstRelation(item.courses)
                  const itemSchedule = firstRelation(item.course_schedules)
                  return <tr key={item.id}>
                    <td>{itemCourse?.title || 'Course'}</td>
                    <td>{itemSchedule?.location || 'Pending schedule'}</td>
                    <td>{formatDate(item.created_at)}</td>
                    <td><span className={`student-status-badge status-${(item.status || 'PENDING').toLowerCase()}`}>{formatStatusLabel(item.status)}</span></td>
                    <td>{formatDate(item.updated_at)}</td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StudentSchedule() {
  const [items, setItems] = useState<Array<{ id: string; status: string; course_schedules?: { starts_at?: string; ends_at?: string; location?: string; trainer?: string }[] | { starts_at?: string; ends_at?: string; location?: string; trainer?: string }; courses?: { title?: string }[] | { title?: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        if (!supabase) throw new Error('Supabase is not configured.')
        const currentProfile = await getCurrentProfile()
        if (!currentProfile) throw new Error('Your profile is unavailable.')
        const { data, error: queryError } = await supabase.from('enrollments').select('id,status,courses(title),course_schedules(starts_at,ends_at,location,trainer)').eq('student_id', currentProfile.id).in('status', ['APPROVED', 'COMPLETED', 'WAITLISTED']).order('created_at', { ascending: false })
        if (!active) return
        if (queryError) throw queryError
        setItems(data ?? [])
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your schedule.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) return <div className="student-section"><div className="student-panel"><p>Loading schedule…</p></div></div>
  if (error) return <div className="student-section"><div className="student-panel student-error"><p>{error}</p></div></div>

  return (
    <div className="student-section">
      <div className="student-panel">
        <div className="student-panel-header">
          <h3>Training schedule</h3>
          <span className="student-pill">Approved</span>
        </div>

        {items.length === 0 ? (
          <p className="student-empty-state">No approved training schedule is available yet.</p>
        ) : (
          <div className="student-schedule-list">
            {items.map(item => {
              const schedule = firstRelation(item.course_schedules)
              const course = firstRelation(item.courses)
              return (
                <div key={item.id} className="student-schedule-item">
                  <div>
                    <span className="student-course-tag">{course?.title || 'Course'}</span>
                    <h4>{schedule?.starts_at ? formatDate(schedule.starts_at) : 'Schedule pending'}</h4>
                  </div>
                  <ul>
                    <li><strong>Start:</strong> {schedule?.starts_at ? formatDateTime(schedule.starts_at) : '—'}</li>
                    <li><strong>End:</strong> {schedule?.ends_at ? formatDateTime(schedule.ends_at) : '—'}</li>
                    <li><strong>Location:</strong> {schedule?.location || '—'}</li>
                    <li><strong>Trainer:</strong> {schedule?.trainer || '—'}</li>
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StudentCertificates() {
  const [items, setItems] = useState<Array<{ id: string; certificate_number: string; issue_date: string; status: string; verification_code: string; file_path?: string; file_name?: string; courses?: { title?: string }[] | { title?: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState('')

  const downloadCertificate = async (item: { id: string; file_path?: string; file_name?: string }) => {
    if (!item.file_path) return
    try {
      setDownloading(item.id)
      const url = await createPrivateFileUrl('certificates', item.file_path)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = item.file_name || 'certificate.pdf'
      anchor.target = '_blank'
      anchor.click()
    } catch (downloadError: unknown) {
      setError(downloadError instanceof Error ? downloadError.message : 'Certificate download failed.')
    } finally { setDownloading('') }
  }
  useEffect(() => {
    let active = true
    async function load() {
      try {
        if (!supabase) throw new Error('Supabase is not configured.')
        const currentProfile = await getCurrentProfile()
        if (!currentProfile) throw new Error('Your profile is unavailable.')
        let { data, error: queryError } = await supabase.from('certificates').select('id,certificate_number,issue_date,status,verification_code,file_path,file_name,courses(title)').eq('student_id', currentProfile.id).order('issue_date', { ascending: false })
        if (queryError?.code === '42703') {
          const fallback = await supabase.from('certificates').select('id,certificate_number,issue_date,status,verification_code,courses(title)').eq('student_id', currentProfile.id).order('issue_date', { ascending: false })
          data = (fallback.data ?? []) as typeof data
          queryError = fallback.error
        }
        if (!active) return
        if (queryError) throw queryError
        setItems(data ?? [])
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load certificates.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) return <div className="student-section"><div className="student-panel"><p>Loading certificates…</p></div></div>
  if (error) return <div className="student-section"><div className="student-panel student-error"><p>{error}</p></div></div>

  return (
    <div className="student-section">
      <div className="student-panel">
        <div className="student-panel-header">
          <h3>Certificates</h3>
          <Link to="/verify-certificate">Verify certificate</Link>
        </div>

        {items.length === 0 ? (
          <p className="student-empty-state">No certificates have been issued yet.</p>
        ) : (
          <div className="student-card-grid">
            {items.map(item => {
              const course = firstRelation(item.courses)
              return <article key={item.id} className="student-certificate-card">
                <div className="student-course-header">
                  <div>
                    <span className="student-course-tag">Certificate</span>
                    <h4>{course?.title || 'Course certificate'}</h4>
                  </div>
                  <span className={`student-status-badge status-${(item.status || 'VALID').toLowerCase()}`}>{formatStatusLabel(item.status)}</span>
                </div>
                <ul>
                  <li><strong>Number:</strong> {item.certificate_number}</li>
                  <li><strong>Issue date:</strong> {formatDate(item.issue_date)}</li>
                  <li><strong>Verification code:</strong> {item.verification_code}</li>
                </ul>
                <div className="student-card-actions">
                  <Link to="/verify-certificate">Verify certificate</Link>
                  {item.file_path ? <button type="button" className="button button-light" onClick={() => downloadCertificate(item)} disabled={downloading === item.id}>{downloading === item.id ? 'Preparing…' : 'Download certificate'}</button> : <span className="student-file-missing">Certificate file is not available yet.</span>}
                </div>
              </article>
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StudentNotifications() {
  const [items, setItems] = useState<Array<{ id: string; title: string; message: string; type: string; read_at?: string; created_at: string }>>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!supabase) return
    const currentProfile = await getCurrentProfile()
    if (!currentProfile) return
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', currentProfile.id).order('created_at', { ascending: false })
    if (!error) setItems(data ?? [])
  }

  useEffect(() => {
    let active = true
    async function load() {
      try {
        await refresh()
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const markRead = async (id: string) => {
    if (!supabase) return
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    await refresh()
  }

  const markAllRead = async () => {
    if (!supabase) return
    const currentProfile = await getCurrentProfile()
    if (!currentProfile) return
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', currentProfile.id).is('read_at', null)
    await refresh()
  }

  if (loading) return <div className="student-section"><div className="student-panel"><p>Loading notifications…</p></div></div>

  return (
    <div className="student-section">
      <div className="student-panel">
        <div className="student-panel-header">
          <h3>Notifications</h3>
          <button className="button button-light" type="button" onClick={markAllRead}>Mark all as read</button>
        </div>

        {items.length === 0 ? (
          <p className="student-empty-state">No notifications yet.</p>
        ) : (
          <div className="student-notification-feed">
            {items.map(item => (
              <div key={item.id} className={`student-notification-item ${item.read_at ? 'read' : 'unread'}`}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <small>{item.type} · {formatDateTime(item.created_at)}</small>
                </div>
                {!item.read_at && <button type="button" className="button button-light" onClick={() => markRead(item.id)}>Mark read</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StudentSettings() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const currentProfile = await getCurrentProfile()
        if (!active) return
        setProfile(currentProfile)
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setSuccess('Password updated securely.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update your password.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="student-section"><div className="student-panel"><p>Loading settings…</p></div></div>

  return (
    <div className="student-section">
      <div className="student-panel">
        <div className="student-panel-header">
          <h3>Settings</h3>
          <span className="student-pill">Profile</span>
        </div>

        <div className="student-settings-grid">
          <div className="student-settings-card">
            <h4>Profile preferences</h4>
            <p><strong>Name:</strong> {profile?.full_name || '—'}</p>
            <p><strong>Email:</strong> {profile?.email || '—'}</p>
            <p><strong>Role:</strong> {profile?.role || 'STUDENT'}</p>
            <p><strong>Joined:</strong> {formatDate(profile?.created_at)}</p>
          </div>

          <div className="student-settings-card">
            <h4>Notification preferences</h4>
            <label className="student-toggle-row">
              <input type="checkbox" checked={notificationsEnabled} onChange={() => setNotificationsEnabled(value => !value)} />
              <span>Enable account notifications</span>
            </label>
            <p className="student-settings-note">Notifications are managed through your student account and admin updates.</p>
          </div>
        </div>

        <form className="student-form" onSubmit={handlePasswordUpdate}>
          <div className="student-panel-header"><h4>Security</h4></div>
          <div className="student-form-grid">
            <label><span>New password</span><PasswordField value={newPassword} onChange={setNewPassword} placeholder="At least 8 characters" label="New password" autoComplete="new-password" /></label>
            <label><span>Confirm password</span><PasswordField value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" label="Confirm password" autoComplete="new-password" /></label>
          </div>
          {error && <div className="student-alert error">{error}</div>}
          {success && <div className="student-alert success">{success}</div>}
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
        </form>
      </div>
    </div>
  )
}
function SimpleForm({ fields, button, onSubmit, selectFields = {} }: { fields: string[]; button: string; onSubmit: (data: FormData) => Promise<void> | void; selectFields?: Record<string, { placeholder: string; options: string[] }> }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try { await onSubmit(new FormData(event.currentTarget)); event.currentTarget.reset() }
    catch (submissionError: unknown) { setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit this form.') }
    finally { setSubmitting(false) }
  }
  return <form onSubmit={submit}>{fields.map((field, i) => <label key={field}>{field}{i === 0 || i === 1 ? <span className="required">*</span> : null}{selectFields[field] ? <select name={field} required={i < 2} defaultValue=""><option value="" disabled>{selectFields[field].placeholder}</option>{selectFields[field].options.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.toLowerCase().includes('message') || field.toLowerCase().includes('idea') || field.toLowerCase().includes('help') || field.toLowerCase().includes('cover') ? <textarea name={field} required={i < 2} placeholder={field} rows={4} /> : <input name={field} required={i < 2} type={field.toLowerCase().includes('email') ? 'email' : field.toLowerCase().includes('date') ? 'date' : field.toLowerCase().includes('password') ? 'password' : 'text'} placeholder={field} />}</label>)}{error && <p className="error-text">{error}</p>}<button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Sending…' : button} <ArrowRight size={16} /></button></form>
}
function CTA() { return <section className="cta"><div className="container cta-inner"><div><div className="eyebrow">Your next step</div><h2>Make room for better care.</h2><p>Explore a program, ask a question or tell us how we can support your work.</p></div><Link className="button button-light" to="/contact">Talk to our team <ArrowRight size={16} /></Link></div></section> }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><Search size={24} /><p>{text}</p></div> }
function NotFound() { return <PageIntro eyebrow="404" title="This page has moved." text="The link you followed does not point to an available page. Let’s get you back to something useful." /> }
function Footer() { const footer = useSiteContent('content.footer', FOOTER_DEFAULTS); const brand = useSiteContent('brand', BRAND_DEFAULTS); return <footer><div className="container footer-grid"><div className="footer-brand"><Link to="/" className="brand">{brand.logoUrl ? <img className="brand-logo-img" src={brand.logoUrl} alt="CP Giraneza Health" /> : <span className="brand-mark"><HeartPulse size={21} /></span>}<span>CP <b>Giraneza</b><small>HEALTH</small></span></Link><p>{footer.description}</p></div><div><h4>Explore</h4><Link to="/courses">Programs</Link><Link to="/home-care">Home care</Link><Link to="/careers">Careers</Link><Link to="/news">News</Link></div><div><h4>Support</h4><Link to="/contact">Contact</Link><Link to="/faq">FAQ</Link><Link to="/partnership">Partnerships</Link><Link to="/verify-certificate">Verify certificate</Link></div><div><h4>Connect</h4><span>{footer.location}</span><a href={`mailto:${footer.email}`}>{footer.email}</a><span>{footer.website}</span><span>{footer.hours}</span></div></div><div className="container footer-bottom"><span>{footer.copyright}</span><span>{footer.legal}</span></div></footer> }
