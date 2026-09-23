import { supabase, isSupabaseConfigured, getCurrentProfile } from '../lib/supabase'
import type { UploadedFile } from '../lib/storage'

/**
 * Admissions data layer.
 *
 * Programmes are read from the existing public `courses` catalogue so the
 * Admissions section always mirrors what the admin team has published.
 * Applications and status look-ups prefer the optional
 * `admission_applications` backend (see backend/admissions.sql) and fall
 * back to an on-device record so the public flow keeps working before
 * that migration is applied.
 */

export type ProgrammeLevel = 'UNDERGRADUATE' | 'POSTGRADUATE' | 'PROFESSIONAL'

export type Programme = {
  id: string
  slug: string
  title: string
  category: string
  level: ProgrammeLevel
  description: string
  duration: string
  price: string
  requirements: string[]
  objectives: string[]
  image: string
}

const defaultProgrammeImage = 'https://images.unsplash.com/photo-1576765608866-5b51046452be?auto=format&fit=crop&w=900&q=80'

export const programmeLevelLabels: Record<ProgrammeLevel, string> = {
  UNDERGRADUATE: 'Undergraduate',
  POSTGRADUATE: 'Postgraduate',
  PROFESSIONAL: 'Professional development',
}

/**
 * Derives the study level from published programme metadata.
 *
 * Today the `courses` table has no explicit level column, so the level is
 * inferred from the title and description. When an explicit level column
 * (or dedicated undergraduate/postgraduate categories) is added to the
 * database, map it here and the rest of the section follows automatically.
 */
export function classifyProgrammeLevel(title: string, description = ''): ProgrammeLevel {
  const haystack = `${title} ${description}`.toLowerCase()
  if (/(master|postgraduate|post-graduate|msc|mba|phd|doctorate)/.test(haystack)) return 'POSTGRADUATE'
  if (/(certificate|diploma|bachelor|degree|assistant|undergraduate|\ba1\b|\ba2\b)/.test(haystack)) return 'UNDERGRADUATE'
  return 'PROFESSIONAL'
}

type CourseRow = {
  id: string
  slug: string
  title: string
  description: string | null
  duration: string | null
  price: number | null
  image_url: string | null
  objectives: string[] | null
  requirements: string[] | null
  category_id: string | null
  course_categories: { name?: string | null } | { name?: string | null }[] | null
}

function firstRelation<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

function mapCourseRow(row: CourseRow): Programme {
  const categoryName = firstRelation(row.course_categories)?.name || 'Learning programme'
  return {
    id: row.id,
    slug: row.slug,
    title: (row.title || 'Programme').trim(),
    category: categoryName,
    level: classifyProgrammeLevel(row.title || '', row.description || ''),
    description: row.description || '',
    duration: (row.duration || '').trim() || 'Confirmed at intake',
    price: `RWF ${Number(row.price ?? 0).toLocaleString()}`,
    requirements: Array.isArray(row.requirements) ? row.requirements : [],
    objectives: Array.isArray(row.objectives) ? row.objectives : [],
    image: row.image_url || defaultProgrammeImage,
  }
}

export type ProgrammeCatalogue = {
  programmes: Programme[]
  error: string | null
}

/** Loads the published programmes shown across the Admissions section. */
export async function fetchAdmissionsProgrammes(): Promise<ProgrammeCatalogue> {
  if (!supabase || !isSupabaseConfigured) {
    return { programmes: [], error: 'The programme catalogue is temporarily unavailable. Please contact the admissions office for current programmes.' }
  }
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('id,slug,title,description,duration,price,image_url,objectives,requirements,category_id,course_categories(name)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { programmes: ((data ?? []) as unknown as CourseRow[]).map(mapCourseRow), error: null }
  } catch (loadError: unknown) {
    return {
      programmes: [],
      error: loadError instanceof Error ? loadError.message : 'Unable to load the programme catalogue right now.',
    }
  }
}

export function filterProgrammes(programmes: Programme[], level: ProgrammeLevel | 'ALL', query: string): Programme[] {
  const normalizedQuery = query.trim().toLowerCase()
  return programmes.filter((programme) => {
    const matchesLevel = level === 'ALL' || programme.level === level
    const haystack = `${programme.title} ${programme.description} ${programme.category} ${programme.duration}`.toLowerCase()
    return matchesLevel && (!normalizedQuery || haystack.includes(normalizedQuery))
  })
}

// ── Applications ───────────────────────────────────────────────────────────

export type AdmissionApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ADDITIONAL_INFO_REQUIRED' | 'ACCEPTED' | 'REJECTED'

export type AdmissionDocument = Pick<UploadedFile, 'name' | 'path' | 'type' | 'size'>

export type AdmissionApplicationInput = {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  sex: string
  nationality: string
  residence: string
  address: string
  educationLevel: string
  institution: string
  graduationYear: string
  languages: string
  personalStatement: string
  firstChoiceId: string
  firstChoiceTitle: string
  secondChoiceId: string
  secondChoiceTitle: string
  documents: AdmissionDocument[]
}

export type AdmissionApplicationRecord = AdmissionApplicationInput & {
  reference: string
  status: AdmissionApplicationStatus
  statusNote?: string
  submittedAt: string
  updatedAt: string
  storage: 'remote' | 'local'
  userId: string | null
}

export type AdmissionStatusResult = {
  reference: string
  fullName: string
  status: AdmissionApplicationStatus
  statusNote?: string
  firstChoiceTitle: string | null
  secondChoiceTitle: string | null
  submittedAt: string
  updatedAt: string
  storage: 'remote' | 'local'
  documents?: AdmissionDocument[]
}

const APPLICATIONS_KEY = 'cpgh_admissions_applications_v1'
const DRAFT_KEY = 'cpgh_admissions_draft_v1'

export const emptyApplicationInput: AdmissionApplicationInput = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  sex: '',
  nationality: 'Rwanda',
  residence: '',
  address: '',
  educationLevel: '',
  institution: '',
  graduationYear: '',
  languages: '',
  personalStatement: '',
  firstChoiceId: '',
  firstChoiceTitle: '',
  secondChoiceId: '',
  secondChoiceTitle: '',
  documents: [],
}

/** Generates a human-readable reference such as CPGH-ADM-2026-K7F3M2. */
export function createAdmissionReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const random = new Uint32Array(6)
  crypto.getRandomValues(random)
  const suffix = Array.from(random, (value) => alphabet[value % alphabet.length]).join('')
  return `CPGH-ADM-${new Date().getFullYear()}-${suffix}`
}

function readLocalRecords(): AdmissionApplicationRecord[] {
  try {
    const raw = window.localStorage.getItem(APPLICATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AdmissionApplicationRecord[]) : []
  } catch {
    return []
  }
}

function writeLocalRecords(records: AdmissionApplicationRecord[]) {
  try {
    window.localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(records.slice(0, 20)))
  } catch {
    // Storage can be unavailable (private browsing); the flow still completes for the session.
  }
}

export function listLocalApplications(): AdmissionApplicationRecord[] {
  return readLocalRecords()
}

export function findLocalApplication(reference: string, email: string): AdmissionApplicationRecord | null {
  const normalizedReference = reference.trim().toUpperCase()
  const normalizedEmail = email.trim().toLowerCase()
  return (
    readLocalRecords().find(
      (record) => record.reference.toUpperCase() === normalizedReference && record.email.toLowerCase() === normalizedEmail,
    ) ?? null
  )
}

export type AdmissionSubmissionResult = {
  record: AdmissionApplicationRecord
  /** Set when the application could not be synced to the remote admissions table. */
  syncNotice: string | null
}

/**
 * Submits an application. The record is always kept on this device so the
 * applicant can track it immediately; it is additionally written to the
 * `admission_applications` table when the optional backend migration has
 * been applied to the connected Supabase project.
 */
export async function submitAdmissionApplication(input: AdmissionApplicationInput): Promise<AdmissionSubmissionResult> {
  const reference = createAdmissionReference()
  const now = new Date().toISOString()
  let storage: 'remote' | 'local' = 'local'
  let syncNotice: string | null = null
  let userId: string | null = null

  if (supabase && isSupabaseConfigured) {
    try {
      const profile = await getCurrentProfile().catch(() => null)
      userId = profile?.id ?? null
      const { error } = await supabase.from('admission_applications').insert({
        reference,
        user_id: userId,
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        date_of_birth: input.dateOfBirth || null,
        sex: input.sex || null,
        nationality: input.nationality || null,
        residence: input.residence || null,
        address: input.address || null,
        education_level: input.educationLevel || null,
        institution: input.institution || null,
        graduation_year: input.graduationYear || null,
        languages: input.languages || null,
        personal_statement: input.personalStatement || null,
        first_choice_id: input.firstChoiceId || null,
        first_choice_title: input.firstChoiceTitle || null,
        second_choice_id: input.secondChoiceId || null,
        second_choice_title: input.secondChoiceTitle || null,
        documents: input.documents,
        status: 'SUBMITTED',
      } as never)
      if (error) {
        syncNotice = 'Your application is saved on this device. Online tracking will be enabled once the admissions office connects the admissions register.'
      } else {
        storage = 'remote'
      }
    } catch {
      syncNotice = 'Your application is saved on this device. Online tracking will be enabled once the admissions office connects the admissions register.'
    }
  }

  const record: AdmissionApplicationRecord = {
    ...input,
    reference,
    status: 'SUBMITTED',
    submittedAt: now,
    updatedAt: now,
    storage,
    userId,
  }

  const records = readLocalRecords().filter((item) => item.reference !== reference)
  writeLocalRecords([record, ...records])
  clearAdmissionDraft()

  return { record, syncNotice }
}

/**
 * Looks up an application by reference + email. Prefers the remote lookup
 * function so applicants on any device can track their application, then
 * falls back to records saved in this browser.
 */
export async function lookupAdmissionApplication(reference: string, email: string): Promise<AdmissionStatusResult | null> {
  const normalizedReference = reference.trim().toUpperCase()
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedReference || !normalizedEmail) return null

  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('lookup_admission_application', {
        p_reference: normalizedReference,
        p_email: normalizedEmail,
      })
      const row = (data as Array<Record<string, unknown>> | null)?.[0]
      if (!error && row) {
        return {
          reference: String(row.reference ?? normalizedReference),
          fullName: String(row.full_name ?? ''),
          status: String(row.status ?? 'SUBMITTED') as AdmissionApplicationStatus,
          statusNote: row.status_note ? String(row.status_note) : undefined,
          firstChoiceTitle: row.first_choice_title ? String(row.first_choice_title) : null,
          secondChoiceTitle: row.second_choice_title ? String(row.second_choice_title) : null,
          submittedAt: String(row.submitted_at ?? ''),
          updatedAt: String(row.updated_at ?? row.submitted_at ?? ''),
          storage: 'remote',
        }
      }
    } catch {
      // Fall through to the on-device records.
    }
  }

  const localRecord = findLocalApplication(normalizedReference, normalizedEmail)
  if (!localRecord) return null
  return {
    reference: localRecord.reference,
    fullName: localRecord.fullName,
    status: localRecord.status,
    statusNote: localRecord.statusNote,
    firstChoiceTitle: localRecord.firstChoiceTitle || null,
    secondChoiceTitle: localRecord.secondChoiceTitle || null,
    submittedAt: localRecord.submittedAt,
    updatedAt: localRecord.updatedAt,
    storage: 'local',
    documents: localRecord.documents,
  }
}

// ── Drafts ─────────────────────────────────────────────────────────────────

export type AdmissionDraft = { data: AdmissionApplicationInput; savedAt: string }

export function saveAdmissionDraft(data: AdmissionApplicationInput): string {
  const savedAt = new Date().toISOString()
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, savedAt }))
  } catch {
    // Draft saving is best-effort.
  }
  return savedAt
}

export function loadAdmissionDraft(): AdmissionDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AdmissionDraft
    if (!parsed?.data) return null
    return { data: { ...emptyApplicationInput, ...parsed.data }, savedAt: parsed.savedAt || '' }
  } catch {
    return null
  }
}

export function clearAdmissionDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Ignore storage failures.
  }
}

// ── Status presentation ────────────────────────────────────────────────────

export type AdmissionStatusTone = 'neutral' | 'progress' | 'attention' | 'success' | 'error'

export const admissionStatusLabels: Record<AdmissionApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  ADDITIONAL_INFO_REQUIRED: 'Additional information required',
  ACCEPTED: 'Accepted',
  REJECTED: 'Not successful',
}

export function admissionStatusMeta(status: AdmissionApplicationStatus): { label: string; tone: AdmissionStatusTone; guidance: string } {
  switch (status) {
    case 'DRAFT':
      return { label: admissionStatusLabels.DRAFT, tone: 'neutral', guidance: 'This application is still a draft. Complete the remaining steps and submit it when you are ready.' }
    case 'UNDER_REVIEW':
      return { label: admissionStatusLabels.UNDER_REVIEW, tone: 'progress', guidance: 'The admissions team is reviewing your application. You will be notified when a decision is ready.' }
    case 'ADDITIONAL_INFO_REQUIRED':
      return { label: admissionStatusLabels.ADDITIONAL_INFO_REQUIRED, tone: 'attention', guidance: 'The admissions team needs more information. Please check your email, then reply with the requested details or documents.' }
    case 'ACCEPTED':
      return { label: admissionStatusLabels.ACCEPTED, tone: 'success', guidance: 'Congratulations. Your place has been offered. The admissions office will contact you with enrolment and intake details.' }
    case 'REJECTED':
      return { label: admissionStatusLabels.REJECTED, tone: 'error', guidance: 'This application was not successful. You may contact the admissions office for feedback and to discuss other programmes.' }
    default:
      return { label: admissionStatusLabels.SUBMITTED, tone: 'progress', guidance: 'Your application has been received. The admissions team will begin reviewing it shortly.' }
  }
}

export type TimelineStepState = 'done' | 'current' | 'upcoming' | 'attention' | 'success' | 'error'

export function admissionStatusTimeline(status: AdmissionApplicationStatus): Array<{ label: string; state: TimelineStepState }> {
  const base = [
    { label: 'Draft', state: 'upcoming' as TimelineStepState },
    { label: 'Submitted', state: 'upcoming' as TimelineStepState },
    { label: 'Under review', state: 'upcoming' as TimelineStepState },
    { label: 'Decision', state: 'upcoming' as TimelineStepState },
  ]
  switch (status) {
    case 'DRAFT':
      base[0].state = 'current'
      break
    case 'SUBMITTED':
      base[0].state = 'done'
      base[1].state = 'current'
      break
    case 'UNDER_REVIEW':
      base[0].state = 'done'
      base[1].state = 'done'
      base[2].state = 'current'
      break
    case 'ADDITIONAL_INFO_REQUIRED':
      base[0].state = 'done'
      base[1].state = 'done'
      base[2].state = 'done'
      base[3].state = 'attention'
      break
    case 'ACCEPTED':
      base[0].state = 'done'
      base[1].state = 'done'
      base[2].state = 'done'
      base[3].state = 'success'
      break
    case 'REJECTED':
      base[0].state = 'done'
      base[1].state = 'done'
      base[2].state = 'done'
      base[3].state = 'error'
      break
  }
  return base
}

export function formatAdmissionDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatAdmissionDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
