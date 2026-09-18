import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
const hasUsableConfig = Boolean(
  url &&
  anonKey &&
  /^https:\/\/[^\s/]+\.[^\s/]+/.test(url) &&
  !url.includes('your-project.supabase.co') &&
  !anonKey.includes('your-anon-key')
)

export const supabase: SupabaseClient | null = hasUsableConfig ? createClient(url!, anonKey!) : null
export const isSupabaseConfigured = hasUsableConfig

// ── Types ──────────────────────────────────────────────────────────────────
export type AppRole = 'ADMIN' | 'STUDENT'
export type EnrollmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WAITLISTED' | 'COMPLETED' | 'CANCELLED'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone?: string
  sex?: string
  role: AppRole
  avatar_url?: string
  avatar_path?: string
  diploma?: string
  age?: number | string
  languages?: string
  identification_number?: string
  residence?: string
  address?: string
  country?: string
  request_status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  category_id?: string
  title: string
  slug: string
  description: string
  objectives: string[]
  requirements: string[]
  duration: string
  price: number
  image_url?: string
  cover_path?: string
  material_path?: string
  material_name?: string
  material_type?: string
  material_size?: number
  is_published: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface CourseSchedule {
  id: string
  course_id: string
  starts_at: string
  ends_at: string
  location: string
  trainer?: string
  max_seats: number
  available_seats: number
  status: string
  created_at: string
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  schedule_id?: string
  status: EnrollmentStatus
  application_note?: string
  created_at: string
  updated_at: string
  profiles?: Profile
  courses?: Course
}

export interface Certificate {
  id: string
  student_id: string
  course_id: string
  certificate_number: string
  verification_code: string
  issue_date: string
  status: string
  file_path?: string
  file_name?: string
  file_type?: string
  file_size?: number
  profiles?: Profile
  courses?: Course
}

export interface NewsItem {
  id: string
  title: string
  slug: string
  category: string
  excerpt: string
  content: string
  image_url?: string
  author_id?: string
  published_at?: string
  is_published: boolean
  created_at: string
}

export interface GalleryItem {
  id: string
  category: string
  caption?: string
  image_url: string
  image_path?: string
  created_at: string
}

export interface Career {
  id: string
  slug: string
  job_title: string
  department: string
  location: string
  employment_type: string
  description: string
  requirements: string[]
  deadline?: string
  is_published: boolean
  created_at: string
}

export interface JobApplication {
  id: string
  career_id?: string
  full_name: string
  email: string
  phone?: string
  cover_message: string
  resume_url?: string
  resume_path?: string
  resume_name?: string
  resume_type?: string
  resume_size?: number
  status: string
  created_at: string
  careers?: Career
}

export interface HomecareService {
  id: string
  name: string
  description: string
  is_active: boolean
}

export interface HomecareRequest {
  id: string
  name: string
  phone: string
  email?: string
  service_id?: string
  preferred_date?: string
  location: string
  message?: string
  attachment_path?: string
  attachment_name?: string
  status: string
  created_at: string
  homecare_services?: HomecareService
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: string
  created_at: string
}

export interface PartnershipRequest {
  id: string
  organization_name: string
  contact_person: string
  email: string
  phone?: string
  partnership_type: string
  message: string
  status: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read_at?: string
  created_at: string
  profiles?: Profile
}

export interface SiteSetting {
  key: string
  value: Record<string, unknown>
  updated_at: string
}

export interface AuditLog {
  id: string
  actor_id?: string
  action: string
  entity: string
  entity_id?: string
  metadata: Record<string, unknown>
  created_at: string
  profiles?: Profile
}

// ── Helpers ────────────────────────────────────────────────────────────────
export async function getCurrentProfile(): Promise<Profile | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user ? getProfileByUserId(user.id) : null
}

/** Retrieves the application profile for an already-authenticated Supabase user. */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

/** Ensures a signed-in user has an application profile even if the signup trigger was unavailable. */
export async function ensureStudentProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return null

  const existing = await getProfileByUserId(userId)
  if (existing) return existing

  const { data, error } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
    email: user.email || '',
    role: 'STUDENT',
    country: user.user_metadata?.country || 'Rwanda',
    request_status: 'PENDING',
  }, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data as Profile
}

/** Supports the current database enum and a lowercase role value during migration. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role?.toUpperCase() === 'ADMIN'
}

export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile()
  return isAdminRole(profile?.role)
}

export async function logAudit(
  action: string,
  entity: string,
  entityId?: string,
  metadata: Record<string, unknown> = {}
) {
  if (!supabase) return
  const { error } = await supabase.rpc('write_audit_log', {
    p_action: action,
    p_entity: entity,
    p_entity_id: entityId ?? null,
    p_metadata: metadata,
  })
  if (error) throw error
}
