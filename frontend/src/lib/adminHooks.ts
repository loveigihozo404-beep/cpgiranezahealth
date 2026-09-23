import { useState, useEffect, useCallback } from 'react'
import { supabase, logAudit } from './supabase'
import type {
  Profile, Course, CourseSchedule, Enrollment, Certificate,
  NewsItem, GalleryItem, Career, JobApplication, HomecareService,
  HomecareRequest, ContactMessage, PartnershipRequest, Notification,
  SiteSetting, AuditLog
} from './supabase'

// ── Generic fetch hook ─────────────────────────────────────────────────────
export function useAdminData<T>(
  fetcher: () => Promise<T[]>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load, setData }
}

// ── Dashboard stats ────────────────────────────────────────────────────────
export interface DashStats {
  users: number
  courses: number
  enrollments: number
  pendingEnrollments: number
  certificates: number
  homecareRequests: number
  contactMessages: number
  jobApplications: number
}

export async function fetchDashStats(): Promise<DashStats> {
  if (!supabase) return { users: 0, courses: 0, enrollments: 0, pendingEnrollments: 0, certificates: 0, homecareRequests: 0, contactMessages: 0, jobApplications: 0 }
  const [u, c, e, ep, cert, hc, cm, ja] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('enrollments').select('id', { count: 'exact', head: true }),
    supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('certificates').select('id', { count: 'exact', head: true }),
    supabase.from('homecare_requests').select('id', { count: 'exact', head: true }),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
    supabase.from('job_applications').select('id', { count: 'exact', head: true }),
  ])
  const failed = [u, c, e, ep, cert, hc, cm, ja].find(result => result.error)
  if (failed?.error) throw failed.error
  return {
    users: u.count ?? 0,
    courses: c.count ?? 0,
    enrollments: e.count ?? 0,
    pendingEnrollments: ep.count ?? 0,
    certificates: cert.count ?? 0,
    homecareRequests: hc.count ?? 0,
    contactMessages: cm.count ?? 0,
    jobApplications: ja.count ?? 0,
  }
}

// ── Users ──────────────────────────────────────────────────────────────────
export async function fetchUsers(): Promise<Profile[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateUserRole(id: string, role: 'ADMIN' | 'STUDENT') {
  if (!supabase) return
  const { error } = await supabase.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  await logAudit('CHANGE_ROLE', 'profiles', id, { role })
}

export async function updateUserProfile(id: string, updates: Partial<Profile>) {
  if (!supabase) return
  const { error } = await supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  await logAudit('UPDATE', 'profiles', id, updates as Record<string, unknown>)
}

// ── Courses ────────────────────────────────────────────────────────────────
export async function fetchCourses(): Promise<Course[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertCourse(course: Partial<Course>): Promise<Course> {
  if (!supabase) throw new Error('Supabase not configured')
  const isNew = !course.id
  const payload = { ...course, updated_at: new Date().toISOString() }
  if (isNew) { payload.created_at = new Date().toISOString() }
  const { data, error } = isNew
    ? await supabase.from('courses').insert(payload).select().single()
    : await supabase.from('courses').update(payload).eq('id', course.id!).select().single()
  if (error) throw error
  await logAudit(isNew ? 'CREATE' : 'UPDATE', 'courses', data.id, { title: data.title })
  return data
}

export async function deleteCourse(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
  await logAudit('DELETE', 'courses', id)
}

export async function toggleCoursePublished(id: string, is_published: boolean) {
  if (!supabase) return
  const { error } = await supabase.from('courses').update({ is_published, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  await logAudit(is_published ? 'PUBLISH' : 'UNPUBLISH', 'courses', id)
}

export async function toggleCourseFeatured(id: string, is_featured: boolean) {
  if (!supabase) return
  const { error } = await supabase.from('courses').update({ is_featured, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  await logAudit('UPDATE', 'courses', id, { is_featured })
}

// ── Schedules ──────────────────────────────────────────────────────────────
export async function fetchSchedules(): Promise<CourseSchedule[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('course_schedules').select('*, courses(title)').order('starts_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertSchedule(schedule: Partial<CourseSchedule>): Promise<CourseSchedule> {
  if (!supabase) throw new Error('Supabase not configured')
  const isNew = !schedule.id
  const payload = { ...schedule, ...(isNew ? { created_at: new Date().toISOString() } : {}) }
  const { data, error } = isNew
    ? await supabase.from('course_schedules').insert(payload).select().single()
    : await supabase.from('course_schedules').update(payload).eq('id', schedule.id!).select().single()
  if (error) throw error
  await logAudit(isNew ? 'CREATE' : 'UPDATE', 'course_schedules', data.id)
  return data
}

export async function deleteSchedule(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('course_schedules').delete().eq('id', id)
  if (error) throw error
  await logAudit('DELETE', 'course_schedules', id)
}

// ── Enrollments ────────────────────────────────────────────────────────────
export async function fetchEnrollments(): Promise<Enrollment[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, profiles(full_name,email), courses(title)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateEnrollmentStatus(id: string, status: string, studentId: string) {
  if (!supabase) return
  const { error } = await supabase.from('enrollments').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  // Notify student (best-effort: a notification failure must not fail the status update)
  const { error: notificationError } = await supabase.from('notifications').insert({
    user_id: studentId,
    title: 'Enrollment Update',
    message: `Your enrollment status has been updated to ${status}.`,
    type: 'ENROLLMENT',
  })
  if (notificationError) console.error('[admin] enrollment notification failed (non-fatal):', notificationError)
  await logAudit('UPDATE_STATUS', 'enrollments', id, { status })
}

// ── Certificates ───────────────────────────────────────────────────────────
export async function fetchCertificates(): Promise<Certificate[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('certificates')
    .select('*, profiles(full_name,email), courses(title)')
    .order('issue_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertCertificate(cert: Partial<Certificate>): Promise<Certificate> {
  if (!supabase) throw new Error('Supabase not configured')
  const isNew = !cert.id
  const { data, error } = isNew
    ? await supabase.from('certificates').insert(cert).select().single()
    : await supabase.from('certificates').update(cert).eq('id', cert.id!).select().single()
  if (error) throw error
  await logAudit(isNew ? 'CREATE' : 'UPDATE', 'certificates', data.id)
  return data
}

export async function revokeCertificate(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('certificates').update({ status: 'REVOKED' }).eq('id', id)
  if (error) throw error
  await logAudit('REVOKE', 'certificates', id)
}

// ── News ───────────────────────────────────────────────────────────────────
export async function fetchNews(): Promise<NewsItem[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('news').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertNews(item: Partial<NewsItem>): Promise<NewsItem> {
  if (!supabase) throw new Error('Supabase not configured')
  const isNew = !item.id
  const payload = { ...item, ...(isNew ? { created_at: new Date().toISOString() } : {}) }
  const { data, error } = isNew
    ? await supabase.from('news').insert(payload).select().single()
    : await supabase.from('news').update(payload).eq('id', item.id!).select().single()
  if (error) throw error
  await logAudit(isNew ? 'CREATE' : 'UPDATE', 'news', data.id, { title: data.title })
  return data
}

export async function deleteNews(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('news').delete().eq('id', id)
  if (error) throw error
  await logAudit('DELETE', 'news', id)
}

export async function toggleNewsPublished(id: string, is_published: boolean) {
  if (!supabase) return
  const published_at = is_published ? new Date().toISOString() : null
  const { error } = await supabase.from('news').update({ is_published, published_at }).eq('id', id)
  if (error) throw error
  await logAudit(is_published ? 'PUBLISH' : 'UNPUBLISH', 'news', id)
}

// ── Gallery ────────────────────────────────────────────────────────────────
export async function fetchGallery(): Promise<GalleryItem[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertGalleryItem(item: Partial<GalleryItem>): Promise<GalleryItem> {
  if (!supabase) throw new Error('Supabase not configured')
  const isNew = !item.id
  const payload = { ...item, ...(isNew ? { created_at: new Date().toISOString() } : {}) }
  const { data, error } = isNew
    ? await supabase.from('gallery').insert(payload).select().single()
    : await supabase.from('gallery').update(payload).eq('id', item.id!).select().single()
  if (error) throw error
  await logAudit(isNew ? 'CREATE' : 'UPDATE', 'gallery', data.id)
  return data
}

export async function deleteGalleryItem(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('gallery').delete().eq('id', id)
  if (error) throw error
  await logAudit('DELETE', 'gallery', id)
}

// ── Careers ────────────────────────────────────────────────────────────────
export async function fetchCareers(): Promise<Career[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('careers').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertCareer(career: Partial<Career>): Promise<Career> {
  if (!supabase) throw new Error('Supabase not configured')
  const isNew = !career.id
  const payload = { ...career, ...(isNew ? { created_at: new Date().toISOString() } : {}) }
  const { data, error } = isNew
    ? await supabase.from('careers').insert(payload).select().single()
    : await supabase.from('careers').update(payload).eq('id', career.id!).select().single()
  if (error) throw error
  await logAudit(isNew ? 'CREATE' : 'UPDATE', 'careers', data.id, { title: data.job_title })
  return data
}

export async function deleteCareer(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('careers').delete().eq('id', id)
  if (error) throw error
  await logAudit('DELETE', 'careers', id)
}

export async function toggleCareerPublished(id: string, is_published: boolean) {
  if (!supabase) return
  const { error } = await supabase.from('careers').update({ is_published }).eq('id', id)
  if (error) throw error
  await logAudit(is_published ? 'PUBLISH' : 'UNPUBLISH', 'careers', id)
}

// ── Job Applications ───────────────────────────────────────────────────────
export async function fetchJobApplications(): Promise<JobApplication[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('job_applications')
    .select('*, careers(job_title)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateJobApplicationStatus(id: string, status: string) {
  if (!supabase) return
  const { error } = await supabase.from('job_applications').update({ status }).eq('id', id)
  if (error) throw error
  await logAudit('UPDATE_STATUS', 'job_applications', id, { status })
}

// ── Home Care ──────────────────────────────────────────────────────────────
export async function fetchHomecareServices(): Promise<HomecareService[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('homecare_services').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function upsertHomecareService(svc: Partial<HomecareService>): Promise<HomecareService> {
  if (!supabase) throw new Error('Supabase not configured')
  const isNew = !svc.id
  const { data, error } = isNew
    ? await supabase.from('homecare_services').insert(svc).select().single()
    : await supabase.from('homecare_services').update(svc).eq('id', svc.id!).select().single()
  if (error) throw error
  await logAudit(isNew ? 'CREATE' : 'UPDATE', 'homecare_services', data.id)
  return data
}

export async function deleteHomecareService(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('homecare_services').delete().eq('id', id)
  if (error) throw error
  await logAudit('DELETE', 'homecare_services', id)
}

export async function fetchHomecareRequests(): Promise<HomecareRequest[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('homecare_requests')
    .select('*, homecare_services(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateHomecareRequestStatus(id: string, status: string) {
  if (!supabase) return
  const { error } = await supabase.from('homecare_requests').update({ status }).eq('id', id)
  if (error) throw error
  await logAudit('UPDATE_STATUS', 'homecare_requests', id, { status })
}

// ── Contact Messages ───────────────────────────────────────────────────────
export async function fetchContactMessages(): Promise<ContactMessage[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateContactMessageStatus(id: string, status: string) {
  if (!supabase) return
  const { error } = await supabase.from('contact_messages').update({ status }).eq('id', id)
  if (error) throw error
  await logAudit('UPDATE_STATUS', 'contact_messages', id, { status })
}

export async function deleteContactMessage(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('contact_messages').delete().eq('id', id)
  if (error) throw error
  await logAudit('DELETE', 'contact_messages', id)
}

// ── Partnership Requests ───────────────────────────────────────────────────
export async function fetchPartnershipRequests(): Promise<PartnershipRequest[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('partnership_requests').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updatePartnershipStatus(id: string, status: string) {
  if (!supabase) return
  const { error } = await supabase.from('partnership_requests').update({ status }).eq('id', id)
  if (error) throw error
  await logAudit('UPDATE_STATUS', 'partnership_requests', id, { status })
}

export async function deletePartnershipRequest(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('partnership_requests').delete().eq('id', id)
  if (error) throw error
  await logAudit('DELETE', 'partnership_requests', id)
}

// ── Notifications ──────────────────────────────────────────────────────────
export async function fetchNotifications(): Promise<Notification[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*, profiles(full_name,email)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createNotification(n: { user_id: string; title: string; message: string; type?: string }) {
  if (!supabase) return
  const { error } = await supabase.from('notifications').insert({ ...n, type: n.type ?? 'SYSTEM' })
  if (error) throw error
  await logAudit('CREATE', 'notifications', undefined, { title: n.title })
}

export async function markNotificationRead(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteNotification(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw error
  await logAudit('DELETE', 'notifications', id)
}

// ── Site Settings ──────────────────────────────────────────────────────────
export async function fetchSiteSettings(): Promise<SiteSetting[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('site_settings').select('*').order('key')
  if (error) throw error
  return data ?? []
}

export async function upsertSiteSetting(key: string, value: Record<string, unknown>) {
  if (!supabase) return
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
  await logAudit('UPDATE', 'site_settings', undefined, { key })
}

// ── Audit Logs ─────────────────────────────────────────────────────────────
export async function fetchAuditLogs(): Promise<AuditLog[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, profiles(full_name,email)')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data ?? []
}

// ── Admission Applications (see backend/admin_upgrade.sql, PART 2) ─────────
export interface AdmissionDocument {
  name?: string
  path?: string
  type?: string
  size?: number
}

export interface AdmissionApplication {
  id: string
  reference: string
  user_id: string | null
  full_name: string
  email: string
  phone: string | null
  date_of_birth: string | null
  sex: string | null
  nationality: string | null
  residence: string | null
  address: string | null
  education_level: string | null
  institution: string | null
  graduation_year: string | null
  languages: string | null
  personal_statement: string | null
  first_choice_id: string | null
  first_choice_title: string | null
  second_choice_id: string | null
  second_choice_title: string | null
  documents: AdmissionDocument[]
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ADDITIONAL_INFO_REQUIRED' | 'ACCEPTED' | 'REJECTED'
  status_note: string | null
  submitted_at: string
  updated_at: string
}

export async function fetchAdmissionApplications(): Promise<AdmissionApplication[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('admission_applications')
    .select('*')
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AdmissionApplication[]
}

/**
 * Moves an application through the admissions workflow. When the applicant has
 * an account, they also receive an in-app notification, so the decision is
 * visible on their dashboard as well as on the status page.
 */
export async function updateAdmissionApplicationStatus(
  application: Pick<AdmissionApplication, 'id' | 'reference' | 'user_id' | 'full_name'>,
  status: AdmissionApplication['status'],
  statusNote: string
) {
  if (!supabase) return
  const { error } = await supabase
    .from('admission_applications')
    .update({ status, status_note: statusNote || null })
    .eq('id', application.id)
  if (error) throw error
  if (application.user_id) {
    const titles: Record<string, string> = {
      UNDER_REVIEW: 'Your application is under review',
      ADDITIONAL_INFO_REQUIRED: 'Additional information required',
      ACCEPTED: 'Application accepted',
      REJECTED: 'Application decision',
      SUBMITTED: 'Application received',
      DRAFT: 'Application draft',
    }
    await supabase.from('notifications').insert({
      user_id: application.user_id,
      title: titles[status] ?? 'Application update',
      message: `Application ${application.reference} is now: ${status.replaceAll('_', ' ').toLowerCase()}.${statusNote ? ` Note: ${statusNote}` : ''}`,
      type: 'ADMISSION',
    })
  }
  await logAudit('UPDATE_STATUS', 'admission_applications', application.id, {
    reference: application.reference,
    status,
    note: statusNote || undefined,
  })
}

export async function deleteAdmissionApplication(application: Pick<AdmissionApplication, 'id' | 'reference' | 'full_name'>) {
  if (!supabase) return
  const { error } = await supabase.from('admission_applications').delete().eq('id', application.id)
  if (error) throw error
  await logAudit('DELETE', 'admission_applications', application.id, {
    reference: application.reference,
    applicant: application.full_name,
  })
}

// ── Student archive (soft-delete) & protected removal ──────────────────────
export async function updateStudentArchive(id: string, archived: boolean, name: string) {
  if (!supabase) return
  const { error } = await supabase.from('profiles').update({ is_archived: archived }).eq('id', id)
  if (error) throw error
  await logAudit(archived ? 'ARCHIVE_STUDENT' : 'RESTORE_STUDENT', 'profiles', id, { name })
}

export async function deleteStudentProfile(id: string, name: string) {
  if (!supabase) return
  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) throw error
  await logAudit('DELETE_STUDENT', 'profiles', id, { name })
}
