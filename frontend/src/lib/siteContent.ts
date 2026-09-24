import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Site content (CMS)
//
// Editable website content is stored in public.site_settings under the
// "content.*" and "brand.*" keys (see backend/admin_upgrade.sql, PART 4, which
// grants the public website read access to exactly those keys). Every area
// below ships with the original on-page copy as its default, so the public
// website renders identically until an administrator saves a change.
// ─────────────────────────────────────────────────────────────────────────────

export type HomeContent = {
  heroEyebrow: string
  heroTitle: string
  heroText: string
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  secondaryCtaHref: string
  heroImage: string
  badgeTitle: string
  badgeText: string
}

export type AboutContent = {
  eyebrow: string
  title: string
  text: string
  image: string
  mission: string
  vision: string
  values: Array<{ title: string; text: string }>
  leadership: Array<{ name: string; role: string }>
}

export type HomeCareContent = {
  eyebrow: string
  title: string
  text: string
  services: string[]
  serviceNote: string
  formEyebrow: string
  formTitle: string
  formText: string
}

export type ContactContent = {
  email: string
  base: string
  responseNote: string
  socials: { instagram: string; linkedin: string; whatsapp: string; facebook: string; tiktok: string; x: string }
}

export type FooterContent = {
  description: string
  location: string
  email: string
  website: string
  hours: string
  copyright: string
  legal: string
}

export type FaqContent = {
  items: Array<{ question: string; answer: string }>
}

export type EnrollContent = {
  welcomeEyebrow: string
  welcomeTitle: string
  welcomeText: string
}

export type PartnersContent = {
  eyebrow: string
  title: string
  text: string
  names: string[]
}

export type AdmissionsContent = {
  overview: { eyebrow: string; title: string; text: string }
  undergraduate: { title: string; text: string }
  postgraduate: { title: string; text: string }
  entryRequirements: { title: string; text: string }
  howToApply: { title: string; text: string; steps: Array<{ title: string; text: string; tip: string }> }
  importantDates: { title: string; text: string; items: Array<{ label: string; value: string; detail: string }> }
  faq: { title: string; text: string; items: Array<{ question: string; answer: string }> }
  helper: { email: string }
}

export type BrandContent = {
  logoUrl: string
}

// ── Defaults (the current website copy — nothing changes until edited) ──────

export const HOME_DEFAULTS: HomeContent = {
  heroEyebrow: 'First aid · emergency care · home support',
  heroTitle: 'When every second matters, confidence saves lives.',
  heroText: 'Practical first-aid training, emergency-care pathways and compassionate support for the people and communities we serve.',
  primaryCtaLabel: 'Learn first aid',
  primaryCtaHref: '/courses/advanced-first-aid',
  secondaryCtaLabel: 'Talk to our team',
  secondaryCtaHref: '/contact',
  heroImage: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=1200&q=88',
  badgeTitle: 'First Aid Emergency Hospital',
  badgeText: 'Calm action. Coordinated care.',
}

export const ABOUT_DEFAULTS: AboutContent = {
  eyebrow: 'About CarePath Training Institute',
  title: 'Training people to make care feel possible.',
  text: 'CarePath Training Institute is a healthcare training and home-care platform focused on practical competence, professional growth and dignified support at home. Our programs are intentionally clear, grounded and connected to the realities of care.',
  image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=86',
  mission: 'To prepare capable, compassionate care professionals through practical, practice-led learning — and to support families with dignified home care in the communities we serve.',
  vision: 'A healthier future built through capable people, where practical competence and compassionate care grow together.',
  values: [
    { title: 'Practical excellence', text: 'Learning designed around confident decisions, clear communication and safe routines.' },
    { title: 'Human at the centre', text: 'Every learner, client and family deserves patience, dignity and respect.' },
    { title: 'Visible progress', text: 'Trackable learning pathways that help people keep moving forward.' },
  ],
  leadership: [],
}

export const HOMECARE_DEFAULTS: HomeCareContent = {
  eyebrow: 'Home care',
  title: 'Thoughtful support, where life happens.',
  text: 'Our home-care services are designed to support everyday wellbeing with respect, clear communication and a dependable human presence.',
  services: ['Elderly support', 'Home assistance', 'Post-care support', 'Basic home health support'],
  serviceNote: 'Configurable support shaped around each person, family and home.',
  formEyebrow: 'Request a conversation',
  formTitle: 'Tell us what support looks like.',
  formText: 'Share a few details and our team will follow up to understand your needs.',
}

export const CONTACT_DEFAULTS: ContactContent = {
  email: 'hello@cpgiranezahealth.rw',
  base: 'Kigali, Rwanda',
  responseNote: 'Within two working days',
  socials: {
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
    whatsapp: 'https://wa.me/250000000000',
    facebook: 'https://facebook.com',
    tiktok: 'https://tiktok.com',
    x: 'https://x.com',
  },
}

export const FOOTER_DEFAULTS: FooterContent = {
  description: 'Empowering competence, inspiring care, transforming communities.',
  location: 'Kigali, Rwanda',
  email: 'hello@cpgiranezahealth.rw',
  website: 'cpgiranezahealth.rw',
  hours: 'Mon - Fri, 8:00 - 17:00',
  copyright: '© 2026 CarePath Training Institute',
  legal: 'Privacy · Terms · Built for better care',
}

export const FAQ_DEFAULTS: FaqContent = {
  items: [
    { question: 'How do I enroll in a program?', answer: 'Our team will guide you through the next step. Create an account or contact us and we will share the current details for this service.' },
    { question: 'Are programs available online?', answer: 'Our team will guide you through the next step. Create an account or contact us and we will share the current details for this service.' },
    { question: 'How are certificates verified?', answer: 'Our team will guide you through the next step. Create an account or contact us and we will share the current details for this service.' },
    { question: 'How can I request home-care support?', answer: 'Our team will guide you through the next step. Create an account or contact us and we will share the current details for this service.' },
  ],
}

export const ENROLL_DEFAULTS: EnrollContent = {
  welcomeEyebrow: 'Create account · Enroll',
  welcomeTitle: 'Welcome to CarePath Training Institute',
  welcomeText: 'Create your account to enroll in programs, follow your application and keep your learning details in one secure place.',
}

export const PARTNERS_DEFAULTS: PartnersContent = {
  eyebrow: 'Our partners',
  title: 'Organizations building better care with us.',
  text: 'We are proud to work alongside healthcare institutions, community organizations and training partners who share our commitment to practical, compassionate care.',
  names: [
    'Kigali Health Center',
    'Rwanda Care Alliance',
    'Community Health Fund',
    'Nyamirambo Training Hospital',
    'East Africa First Aid Council',
    'Hope Home Care Network',
  ],
}

export const ADMISSIONS_DEFAULTS: AdmissionsContent = {
  overview: {
    eyebrow: 'Admissions · CarePath Training Institute',
    title: 'Your pathway into professional health and social care starts here.',
    text: 'Practical, practice-led programmes with a clear application journey — from your first enquiry to enrolment. Everything you need to apply lives on this page.',
  },
  undergraduate: {
    title: 'Certificate and diploma pathways into care.',
    text: 'Start your professional journey in health and social care support. Undergraduate admissions are open to school leavers, graduates of accredited institutions and career changers.',
  },
  postgraduate: {
    title: 'Specialise, lead and teach in care.',
    text: 'Postgraduate admissions are designed for qualified professionals who want to deepen their expertise, take on leadership roles or teach the next generation of care workers.',
  },
  entryRequirements: {
    title: 'Know what you need before you apply.',
    text: 'Check the general requirements for your pathway, then review the programme-specific requirements in the catalogue. The admissions team confirms your eligibility during review.',
  },
  howToApply: {
    title: 'From first enquiry to submitted application.',
    text: 'The application is completed online in short, guided steps. Your progress is saved as a draft, so you can leave and return at any time.',
    steps: [
      { title: 'Explore programmes', text: 'Browse the programme catalogue and compare duration, level and requirements before choosing your pathway.', tip: 'Tip: prepare a first and a second preference before you start.' },
      { title: 'Create your account or continue as a guest', text: 'Sign in or create a free account so your details are saved, or continue as a guest and add an account later.', tip: 'Tip: an account lets you track every application in one place.' },
      { title: 'Personal information', text: 'Tell us who you are: name, contact details, date of birth and address. Accuracy here matters — this is how the team reaches you.', tip: 'Tip: use the email address you check most often.' },
      { title: 'Academic information', text: 'Add your highest qualification, the institution and your graduation year, plus your strongest language of study.', tip: 'Tip: if certificates are in another name, note this in your personal statement.' },
      { title: 'Programme selection', text: 'Search and filter the catalogue, review the requirements shown for each programme, then choose a first and an optional second preference.', tip: 'Tip: you can see entry requirements without leaving the page.' },
      { title: 'Required documents', text: 'Confirm the documents you have ready and, when available, upload copies of your ID, certificates and photograph.', tip: 'Tip: uploads are optional — documents can follow if the team requests them.' },
      { title: 'Review, submit and track', text: 'Check the summary, confirm your declaration and submit. You receive a reference number instantly and can follow your progress on the status page.', tip: 'Tip: save your reference number — you will use it for every follow-up.' },
    ],
  },
  importantDates: {
    title: 'An admissions cycle that works around you.',
    text: 'CarePath Training Institute runs rolling admissions, which means you can apply at any time of year. Here is how the cycle works from submission to your first day.',
    items: [
      { label: 'Applications', value: 'Open year-round', detail: 'Applications are received continuously and reviewed in the order they are submitted.' },
      { label: 'Review', value: 'As soon as you submit', detail: 'The admissions team begins reviewing your application right after submission.' },
      { label: 'Decision', value: 'Communicated by email', detail: 'You are notified by email as soon as a decision is made — you can also check the status page at any time.' },
      { label: 'Cohort start', value: 'Rolling intakes', detail: 'New cohorts begin on a rolling basis. The admissions office confirms your exact start date after acceptance.' },
    ],
  },
  faq: {
    title: 'Frequently asked questions about admissions.',
    text: 'Quick answers about applying, documents, tracking your application and what happens next. If your question is not here, our admissions team is one message away.',
    items: [
      { question: 'Who can apply to CarePath Training Institute programmes?', answer: 'Our certificate programmes are open to national and international applicants who hold at least an A2 (secondary school) certificate in any field, as well as graduates of accredited institutions who want to pursue health and social care studies. Postgraduate pathways require a relevant first qualification, which the admissions office verifies during review.' },
      { question: 'How do I apply?', answer: 'Complete the online application on the Application page. You move through personal information, academic information, programme selection, required documents and a final review before submitting. You receive a reference number immediately after submission.' },
      { question: 'Do I need an account before applying?', answer: 'An account is recommended because it keeps your details in one place and makes future applications faster. If you prefer, you can also complete the application as a guest and create an account later.' },
      { question: 'What happens after I submit my application?', answer: 'Your application is recorded with a unique reference number and queued for review by the admissions team. You are notified by email as soon as the status changes, and you can follow progress at any time on the Application Status page.' },
      { question: 'How do I check my application status?', answer: 'Open the Application Status page, enter your reference number and the email address you applied with, and your current status is displayed with a step-by-step timeline, from submitted through review to the final decision.' },
      { question: 'Which documents do I need?', answer: 'Normally a copy of your national ID or passport, your academic certificates or transcripts, and a passport-size photo. The admissions team may request additional documents, such as proof of address or translated certificates, during review.' },
      { question: 'Is there an application fee?', answer: 'No payment is required to submit the online application. Any enrolment-related fees are confirmed in writing by the admissions office before you enrol, and you receive a reference number for every amount you are asked to pay.' },
      { question: 'When are the intakes?', answer: 'Applications are received throughout the year and new cohorts begin on a rolling basis. The admissions office confirms the exact start date for your cohort after your application is accepted — see the Important Dates page for the application cycle.' },
      { question: 'Can I apply for more than one programme?', answer: 'Yes. Each application lets you choose a first and a second preference. If you want to change or add a preference after submitting, contact the admissions office with your reference number and they will update your record.' },
      { question: 'How will I be contacted about my application?', answer: 'All applicants are contacted through the email address provided in the application. Keep it up to date and check your inbox (including spam) after submitting; you can also follow progress on the Application Status page.' },
    ],
  },
  helper: { email: 'hello@cpgiranezahealth.rw' },
}

export const BRAND_DEFAULTS: BrandContent = {
  logoUrl: '/cp-giraneza-health-logo.png',
}

// ── Key registry (used by the Admin > Website Content editors) ──────────────

export const CONTENT_AREAS: Array<{ key: string; label: string; description: string; preview: string }> = [
  { key: 'content.home', label: 'Home', description: 'Hero title, description, calls to action and image', preview: '/' },
  { key: 'content.about', label: 'About Us', description: 'Heading, introduction and values', preview: '/about' },
  { key: 'content.homecare', label: 'Home Care', description: 'Introduction, service list and enquiry text', preview: '/home-care' },
  { key: 'content.admissions', label: 'Admissions', description: 'Overview, pathways, requirements, dates and FAQs', preview: '/admissions' },
  { key: 'content.enroll', label: 'Enroll & Create Account', description: 'Welcome message shown on the create-account page', preview: '/register' },
  { key: 'content.partners', label: 'Partners', description: 'Partner names featured on the partnership page', preview: '/partnership' },
  { key: 'content.contact', label: 'Contact', description: 'Email, location, response time and social links', preview: '/contact' },
  { key: 'content.faq', label: 'FAQs', description: 'Frequently asked questions on the public FAQ page', preview: '/faq' },
  { key: 'content.footer', label: 'Footer', description: 'Footer description, contact details, website and copyright', preview: '/' },
  { key: 'brand', label: 'Branding', description: 'Official logo used across the website and admin portal', preview: '/' },
]

// ── Loading, merging and caching ────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeBranding(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replaceAll('CP Giraneza Health', 'CarePath Training Institute').replaceAll('CP Giraneza', 'CarePath Training Institute').replaceAll('Carepath Training Institute', 'CarePath Training Institute')
  }
  if (Array.isArray(value)) return value.map(normalizeBranding)
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeBranding(item)]))
  return value
}

/** Stored values override defaults; missing fields keep their default. */
export function mergeContent<T extends object>(defaults: T, stored: unknown): T {
  if (!isPlainObject(stored)) return defaults
  const merged = { ...defaults } as Record<string, unknown>
  Object.entries(normalizeBranding(stored) as Record<string, unknown>).forEach(([key, value]) => {
    const base = merged[key]
    if (isPlainObject(base) && isPlainObject(value)) merged[key] = mergeContent(base, value)
    else if (value !== null && value !== undefined) merged[key] = value
  })
  return merged as T
}

const rawCache = new Map<string, unknown>()
const pending = new Map<string, Promise<unknown>>()

async function fetchStoredValue(key: string): Promise<unknown> {
  const client = supabase
  if (!client) return null
  if (rawCache.has(key)) return rawCache.get(key)
  if (pending.has(key)) return pending.get(key)
  const request = (async () => {
    try {
      const { data, error } = await client.from('site_settings').select('value').eq('key', key).maybeSingle()
      if (error) return null
      const value = data?.value ?? null
      rawCache.set(key, value)
      return value
    } catch {
      return null
    } finally {
      pending.delete(key)
    }
  })()
  pending.set(key, request)
  return request
}

/** Loads one content area, merged over its defaults. Never throws. */
export async function loadSiteContent<T extends object>(key: string, defaults: T): Promise<T> {
  try {
    const stored = await fetchStoredValue(key)
    return mergeContent(defaults, stored)
  } catch {
    return defaults
  }
}

/** Drops cached content so the next render reloads it (used after admin saves). */
export function clearSiteContentCache(key?: string) {
  if (key) rawCache.delete(key)
  else rawCache.clear()
}

/**
 * React hook: returns the editable content for one area, falling back to the
 * original copy whenever the backend is unavailable or nothing is stored yet.
 */
export function useSiteContent<T extends object>(key: string, defaults: T): T {
  const defaultsRef = useRef(defaults)
  const [data, setData] = useState<T>(() => {
    const cached = rawCache.get(key)
    return cached === undefined ? defaults : mergeContent(defaults, cached)
  })
  useEffect(() => {
    let active = true
    loadSiteContent(key, defaultsRef.current).then((value) => { if (active) setData(value) })
    return () => { active = false }
  }, [key])
  return data
}

// ── Admin helpers ───────────────────────────────────────────────────────────

/** Saves one content area (admin only — enforced by site_settings RLS). */
export async function saveSiteContent(key: string, value: unknown): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value: value as never, updated_at: new Date().toISOString() })
  if (error) throw error
  rawCache.set(key, value)
}

/** Removes a stored override so the area returns to its original copy. */
export async function resetSiteContent(key: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('site_settings').delete().eq('key', key)
  if (error) throw error
  rawCache.delete(key)
}
