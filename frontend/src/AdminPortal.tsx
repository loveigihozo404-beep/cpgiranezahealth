import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, BookOpen, Calendar, ClipboardList,
  Award, Newspaper, Image, Briefcase, FileText, Heart, Mail,
  Handshake, Bell, Settings, ScrollText, LogOut, Menu, X,
  Search, ChevronDown, ChevronLeft, MoreVertical, CheckCircle2, AlertTriangle, Info,
  Plus, Pencil, Trash2, Eye, EyeOff, Star, StarOff,
  RefreshCw, Shield, Home,
  UserCheck, Clock, CheckCheck, XCircle, Ban,
  HeartPulse, ChevronRight, Archive, ArchiveRestore, FolderOpen, Globe
} from 'lucide-react'
import { supabase, getCurrentProfile, isAdminRole, logAudit, getErrorMessage } from './lib/supabase'
import type { Profile } from './lib/supabase'
import {
  useAdminData, fetchDashStats, fetchUsers, fetchCourses,
  fetchSchedules, fetchEnrollments, fetchCertificates,
  fetchNews, fetchGallery, fetchCareers, fetchJobApplications,
  fetchHomecareServices, fetchHomecareRequests, fetchContactMessages,
  fetchPartnershipRequests, fetchNotifications, fetchSiteSettings,
  fetchAuditLogs, updateUserRole, updateUserProfile,
  upsertCourse, deleteCourse, toggleCoursePublished, toggleCourseFeatured,
  upsertSchedule, deleteSchedule,
  updateEnrollmentStatus, upsertCertificate, revokeCertificate,
  upsertNews, deleteNews, toggleNewsPublished,
  upsertGalleryItem, deleteGalleryItem,
  upsertCareer, deleteCareer, toggleCareerPublished,
  updateJobApplicationStatus,
  upsertHomecareService, deleteHomecareService, updateHomecareRequestStatus,
  updateContactMessageStatus, deleteContactMessage,
  updatePartnershipStatus, deletePartnershipRequest,
  createNotification, markNotificationRead, deleteNotification,
  upsertSiteSetting, updateStudentArchive, deleteStudentProfile
} from './lib/adminHooks'
import type { DashStats } from './lib/adminHooks'
import './admin.css'
import FileUploader from './components/FileUploader'
import { PasswordField } from './components/PasswordField'
import { createPrivateFileUrl, getPublicFileUrl, moveStoredFile, type UploadedFile } from './lib/storage'
import { AdminApplications, AdminDocuments, AdminWebsiteContent } from './AdminExtras'
import { BRAND_DEFAULTS, useSiteContent } from './lib/siteContent'
import { ThemeToggle } from './components/ThemeToggle'

// ── Toast ──────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info'
interface ToastMsg { id: number; type: ToastType; text: string }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const counter = useRef(0)
  const show = useCallback((text: string, type: ToastType = 'success') => {
    const id = ++counter.current
    setToasts(t => [...t, { id, type, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])
  return { toasts, show }
}

function ToastContainer({ toasts, onClose }: { toasts: ToastMsg[]; onClose: (id: number) => void }) {
  return (
    <div className="admin-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`admin-toast admin-toast-${t.type}`}>
          {t.type === 'success' && <CheckCircle2 size={16} />}
          {t.type === 'error' && <AlertTriangle size={16} />}
          {t.type === 'info' && <Info size={16} />}
          <span>{t.text}</span>
          <button className="admin-toast-close" onClick={() => onClose(t.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  )
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal admin-confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-body">
          <div className="admin-confirm-icon"><AlertTriangle size={22} /></div>
          <h2>Confirm Action</h2>
          <p>{message}</p>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="admin-btn admin-btn-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ── Password Change Page ───────────────────────────────────────────────────
function PasswordChangePage({ onDone }: { onDone: () => void }) {
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [conf, setConf] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = next.length === 0 ? 0 : next.length < 8 ? 1 : next.length < 12 ? 2 : /[A-Z]/.test(next) && /[0-9]/.test(next) && /[^A-Za-z0-9]/.test(next) ? 4 : 3
  const strengthColor = ['#3a6070', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'][strength]
  const strengthLabel = ['', 'Too short', 'Weak', 'Good', 'Strong'][strength]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (next.length < 8) { setErr('Password must be at least 8 characters.'); return }
    if (next !== conf) { setErr('Passwords do not match.'); return }
    if (!supabase) { setErr('Supabase not configured.'); return }
    setLoading(true)
    // Re-authenticate with current password first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setErr('Session error. Please log in again.'); setLoading(false); return }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: cur })
    if (signInErr) { setErr('Current password is incorrect.'); setLoading(false); return }
    const { error } = await supabase.auth.updateUser({ password: next })
    if (error) { setErr(error.message); setLoading(false); return }
    await logAudit('PASSWORD_CHANGE', 'auth', user.id)
    setLoading(false)
    onDone()
  }

  return (
    <div className="admin-pw-page">
      <div className="admin-pw-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(20,184,197,.15)', display: 'grid', placeItems: 'center', color: '#14b8c5' }}>
            <Shield size={20} />
          </div>
          <div>
            <h1>Change Password</h1>
            <p style={{ margin: 0 }}>Secure your admin account with a new password.</p>
          </div>
        </div>
        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <div className="admin-field">
            <label>Current Password</label>
            <PasswordField value={cur} onChange={setCur} required placeholder="Current password" label="Current password" autoComplete="current-password" />
          </div>
          <div className="admin-field">
            <label>New Password</label>
            <PasswordField value={next} onChange={setNext} required placeholder="New password (min 8 chars)" label="New password" autoComplete="new-password" />
            {next && (
              <div>
                <div className="pw-strength" style={{ width: `${strength * 25}%`, background: strengthColor }} />
                <small style={{ color: strengthColor, fontSize: 11 }}>{strengthLabel}</small>
              </div>
            )}
          </div>
          <div className="admin-field">
            <label>Confirm New Password</label>
            <PasswordField value={conf} onChange={setConf} required placeholder="Confirm new password" label="Confirm new password" autoComplete="new-password" />
          </div>
          {err && <p style={{ color: '#ef4444', fontSize: 12, margin: 0, background: 'rgba(239,68,68,.1)', padding: '8px 12px', borderRadius: 6 }}>{err}</p>}
          <button className="admin-btn admin-btn-primary" type="submit" disabled={loading} style={{ marginTop: 4, height: 44, fontSize: 14 }}>
            {loading ? 'Updating…' : 'Update Password'}
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onDone} style={{ height: 44 }}>
            Skip for now
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Sidebar nav items ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'OVERVIEW' },
  { key: 'users', label: 'Students', icon: Users, section: 'PEOPLE' },
  { key: 'applications', label: 'Applications', icon: ClipboardList, section: 'PEOPLE' },
  { key: 'documents', label: 'Documents', icon: FolderOpen, section: 'PEOPLE' },
  { key: 'courses', label: 'Programmes', icon: BookOpen, section: 'LEARNING' },
  { key: 'schedules', label: 'Schedules', icon: Calendar, section: 'LEARNING' },
  { key: 'enrollments', label: 'Enrollments', icon: ClipboardList, section: 'LEARNING' },
  { key: 'certificates', label: 'Certificates', icon: Award, section: 'LEARNING' },
  { key: 'website-content', label: 'Website Content', icon: Globe, section: 'CONTENT' },
  { key: 'news', label: 'News', icon: Newspaper, section: 'CONTENT' },
  { key: 'gallery', label: 'Gallery', icon: Image, section: 'CONTENT' },
  { key: 'careers', label: 'Careers', icon: Briefcase, section: 'CONTENT' },
  { key: 'job-applications', label: 'Job Applications', icon: FileText, section: 'CONTENT' },
  { key: 'homecare-services', label: 'Home Care Services', icon: Heart, section: 'HOME CARE' },
  { key: 'homecare-requests', label: 'Home Care Requests', icon: Home, section: 'HOME CARE' },
  { key: 'contact-messages', label: 'Contact Messages', icon: Mail, section: 'INBOX' },
  { key: 'partnership-requests', label: 'Partnership Requests', icon: Handshake, section: 'INBOX' },
  { key: 'notifications', label: 'Notifications', icon: Bell, section: 'SYSTEM' },
  { key: 'site-settings', label: 'Site Settings', icon: Settings, section: 'SYSTEM' },
  { key: 'audit-logs', label: 'Audit Logs', icon: ScrollText, section: 'SYSTEM' },
]

// ── Status badge helper ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: 'badge-green', ACTIVE: 'badge-green', VALID: 'badge-green', PUBLISHED: 'badge-green',
    ACCEPTED: 'badge-green', OPEN: 'badge-green', NEW: 'badge-cyan', READ: 'badge-blue',
    SUBMITTED: 'badge-blue', UNDER_REVIEW: 'badge-cyan', PENDING: 'badge-amber',
    WAITLISTED: 'badge-amber', REVIEWING: 'badge-amber', ADDITIONAL_INFO_REQUIRED: 'badge-amber',
    REJECTED: 'badge-red', CANCELLED: 'badge-red', REVOKED: 'badge-red', CLOSED: 'badge-red',
    COMPLETED: 'badge-purple', INACTIVE: 'badge-gray', DRAFT: 'badge-gray', ARCHIVED: 'badge-gray',
  }
  return <span className={`admin-badge ${map[status] ?? 'badge-gray'}`}>{status}</span>
}

// ── Format date ────────────────────────────────────────────────────────────
function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export { StatusBadge, fmtDate, ConfirmDialog, ToastContainer, useToast }
export type { ToastType, ToastMsg }

// ── Admin Dashboard Overview ───────────────────────────────────────────────
function AdminDashboard({ onNav, profile }: { onNav: (k: string) => void; profile: Profile | null }) {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof fetchAuditLogs>>>([])
  const [enrollments, setEnrollments] = useState<Awaited<ReturnType<typeof fetchEnrollments>>>([])
  const [refreshing, setRefreshing] = useState(false)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Administrator'

  async function load() {
    setRefreshing(true)
    await Promise.all([
      fetchDashStats().then(setStats),
      fetchAuditLogs().then(d => setLogs(d.slice(0, 8))),
      fetchEnrollments().then(setEnrollments)
    ])
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const cards = stats ? [
    { label: 'Total Users', value: stats.users, icon: Users, color: 'cyan', key: 'users' },
    { label: 'Courses', value: stats.courses, icon: BookOpen, color: 'blue', key: 'courses' },
    { label: 'Enrollments', value: stats.enrollments, icon: ClipboardList, color: 'purple', key: 'enrollments' },
    { label: 'Pending', value: stats.pendingEnrollments, icon: Clock, color: 'amber', key: 'enrollments' },
    { label: 'Certificates', value: stats.certificates, icon: Award, color: 'green', key: 'certificates' },
    { label: 'Home Care', value: stats.homecareRequests, icon: Heart, color: 'red', key: 'homecare-requests' },
    { label: 'Messages', value: stats.contactMessages, icon: Mail, color: 'blue', key: 'contact-messages' },
    { label: 'Job Apps', value: stats.jobApplications, icon: FileText, color: 'purple', key: 'job-applications' },
  ] : []

  const activityDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    return date
  })
  const activityData = activityDays.map(day => logs.filter(log => {
    const created = new Date(log.created_at)
    return created >= day && created < new Date(day.getTime() + 86400000)
  }).length)
  const activityMax = Math.max(...activityData, 1)
  const activityHasData = activityData.some(value => value > 0)
  const programmeCounts = enrollments.reduce<Record<string, number>>((counts, enrollment) => {
    const title = enrollment.courses?.title?.trim()
    if (title) counts[title] = (counts[title] ?? 0) + 1
    return counts
  }, {})
  const programmes = Object.entries(programmeCounts).sort(([, a], [, b]) => b - a).slice(0, 4)
  const programmeTotal = programmes.reduce((total, [, count]) => total + count, 0)
  const programmeColors = ['#2c9de0', '#7b5fe5', '#23c2bf', '#5579bf']
  let programmeOffset = 0
  const programmeGradient = programmes.map(([, count], index) => {
    const start = programmeOffset
    programmeOffset += programmeTotal ? (count / programmeTotal) * 100 : 0
    return `${programmeColors[index]} ${start}% ${programmeOffset}%`
  }).join(', ')

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Dashboard</h1><p>Overview of your healthcare platform</p></div>
        <button className="admin-btn admin-btn-ghost" onClick={load} disabled={refreshing}>
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      <div className="admin-welcome-banner">
        <div>
          <span className="admin-eyebrow">CP Giraneza Health · Admin Portal</span>
          <h2>{greeting}, {firstName} <span aria-hidden="true">👋</span></h2>
          <p>Welcome back. Here is what is happening across your platform today.</p>
        </div>
        <div className="admin-welcome-visual" aria-hidden="true">
          <HeartPulse size={28} />
          <span className="admin-welcome-pulse" />
        </div>
      </div>

      {!stats ? (
        <div className="admin-loading"><div className="admin-spinner" /><span>Loading statistics…</span></div>
      ) : (
        <div className="admin-stats-grid">
          {cards.map(c => (
            <div className="admin-stat-card" key={c.label} style={{ cursor: 'pointer' }} onClick={() => onNav(c.key)}>
              <div className={`admin-stat-icon ${c.color}`}><c.icon size={20} /></div>
              <div className="admin-stat-body">
                <small>{c.label}</small>
                <strong>{c.value}</strong>
                <span>Click to manage</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="admin-dash-grid">
        <div className="admin-card admin-activity-overview">
          <div className="admin-card-header"><div><h2>Activity Overview</h2><p>Administrative activity from the last 7 days</p></div><span className="admin-period-label">Last 7 days</span></div>
          {activityHasData ? (
            <div className="admin-activity-chart" aria-label="Administrative activity for the last seven days">
              <div className="admin-chart-gridlines" aria-hidden="true"><span /><span /><span /><span /></div>
              <div className="admin-chart-bars">
                {activityData.map((value, index) => (
                  <div className="admin-chart-column" key={activityDays[index].toISOString()}>
                    <span className="admin-chart-value">{value}</span>
                    <div className="admin-chart-bar" style={{ height: `${Math.max(8, (value / activityMax) * 150)}px` }} title={`${value} ${value === 1 ? 'activity' : 'activities'}`} />
                    <small>{activityDays[index].toLocaleDateString('en-GB', { weekday: 'short' })}</small>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="admin-chart-empty"><ScrollText size={24} /><strong>No activity data available yet</strong><span>Administrative events will appear here as the portal is used.</span></div>
          )}
        </div>

        <div className="admin-card admin-programmes-card">
          <div className="admin-card-header"><div><h2>Top Programmes</h2><p>Distribution of current enrollments</p></div></div>
          <div className="admin-programme-visual">
            <div className={`admin-programme-donut ${programmes.length === 0 ? 'empty' : ''}`} style={programmes.length ? { background: `conic-gradient(${programmeGradient})` } : undefined}><span>{programmeTotal || '—'}</span></div>
            {programmes.length === 0 && <div className="admin-programme-empty"><BookOpen size={20} /><strong>No programme distribution data available yet</strong><span>Rankings will appear when enrollments include course data.</span></div>}
          </div>
          {programmes.length > 0 && (
            <div className="admin-programme-list">
              {programmes.map(([title, count], index) => (
                <div className="admin-programme-row" key={title}>
                  <div className={`admin-programme-dot programme-${index}`} />
                  <span title={title}>{title}</span>
                  <strong>{programmeTotal ? Math.round((count / programmeTotal) * 100) : 0}%</strong>
                </div>
              ))}
            </div>
          )}
          <button className="admin-programme-link" onClick={() => onNav('enrollments')}>View all enrollments <ChevronRight size={13} /></button>
        </div>

        <div className="admin-dash-side">
        <div className="admin-card">
          <div className="admin-card-header"><div><h2>Recent Activity</h2><p>Latest administrative events</p></div><span className="admin-badge badge-cyan">{logs.length}</span></div>
          <div className="admin-activity-panel">
            {logs.length === 0 ? (
              <div className="admin-chart-empty"><ScrollText size={24} /><strong>No recent activity</strong><span>New events will appear here.</span></div>
            ) : (
              <div className="admin-activity-list">
                {logs.slice(0, 5).map(l => (
                  <div className="admin-activity-item" key={l.id}>
                    <div className={`admin-activity-dot ${l.action.includes('DELETE') || l.action.includes('REVOKE') ? 'red' : l.action.includes('REJECT') || l.action.includes('CANCEL') ? 'amber' : 'green'}`} />
                    <div className="admin-activity-body">
                      <span><strong>{l.action}</strong><small>{l.entity}</small></span>
                      <small>{fmtDate(l.created_at)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="admin-view-activity" onClick={() => onNav('audit-logs')}>View All Activity <ChevronRight size={13} /></button>
        </div>

          <div className="admin-card">
            <div className="admin-card-header"><h2>Quick Actions</h2></div>
            <div style={{ padding: '8px 12px 12px' }}>
              <div className="admin-quick-links">
                {[
                  { label: 'Add Course', key: 'courses', icon: BookOpen },
                  { label: 'View Enrollments', key: 'enrollments', icon: ClipboardList },
                  { label: 'Issue Certificate', key: 'certificates', icon: Award },
                  { label: 'Read Messages', key: 'contact-messages', icon: Mail },
                  { label: 'Job Applications', key: 'job-applications', icon: FileText },
                  { label: 'Audit Logs', key: 'audit-logs', icon: ScrollText },
                ].map(q => (
                  <button key={q.key} className="admin-quick-link" onClick={() => onNav(q.key)}>
                    <q.icon size={15} />{q.label}<ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      <section className="admin-secondary-grid">
        <div className="admin-card admin-operations-card">
          <div className="admin-card-header"><div><h2>Healthcare Operations</h2><p>Live operational signals from the platform</p></div><HeartPulse size={18} className="admin-card-header-icon" /></div>
          <div className="admin-operation-grid">
            <button className="admin-operation-item" onClick={() => onNav('enrollments')}>
              <span className="admin-operation-icon amber"><Clock size={17} /></span>
              <span><small>Pending applications</small><strong>{stats?.pendingEnrollments ?? '—'}</strong><em>{stats ? 'Needs review' : 'Loading data'}</em></span>
              <ChevronRight size={14} />
            </button>
            <button className="admin-operation-item" onClick={() => onNav('homecare-requests')}>
              <span className="admin-operation-icon red"><Heart size={17} /></span>
              <span><small>Home care requests</small><strong>{stats?.homecareRequests ?? '—'}</strong><em>{stats ? 'Service enquiries' : 'Loading data'}</em></span>
              <ChevronRight size={14} />
            </button>
            <div className="admin-operation-item admin-operation-status">
              <span className="admin-operation-icon cyan"><Shield size={17} /></span>
              <span><small>System status</small><strong>{supabase ? 'Operational' : 'Not configured'}</strong><em>{profile ? 'Admin access verified' : 'Session unavailable'}</em></span>
              <span className={`admin-status-dot ${supabase && profile ? 'online' : ''}`} aria-label={supabase && profile ? 'Operational' : 'Unavailable'} />
            </div>
          </div>
        </div>

        <div className="admin-card admin-data-table-card">
          <div className="admin-card-header"><div><h2>Recent Enrollments</h2><p>Latest student and programme records</p></div><button className="admin-card-link" onClick={() => onNav('enrollments')}>View all <ChevronRight size={13} /></button></div>
          {enrollments.length === 0 ? (
            <div className="admin-table-empty"><ClipboardList size={23} /><strong>No enrollment data available yet</strong><span>New student enrollments will appear here.</span></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-enrollment-table">
                <thead><tr><th>Student</th><th>Programme</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>{enrollments.slice(0, 5).map(enrollment => (
                  <tr key={enrollment.id}>
                    <td><span className="admin-table-person"><span>{(enrollment.profiles?.full_name ?? '?').slice(0, 1).toUpperCase()}</span><strong>{enrollment.profiles?.full_name ?? 'Unknown student'}</strong></span></td>
                    <td>{enrollment.courses?.title ?? <span className="admin-table-muted">Programme unavailable</span>}</td>
                    <td><StatusBadge status={enrollment.status} /></td>
                    <td>{fmtDate(enrollment.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="admin-recommendations">
        <div className="admin-section-heading"><div><span className="admin-eyebrow">Keep improving the portal</span><h2>Improvements &amp; Recommendations</h2></div></div>
        <div className="admin-recommendation-grid">
          {[
            ['1', 'Visual Hierarchy', 'Keep high-priority tasks and status signals easy to scan.', 'cyan'],
            ['2', 'Consistent Icons', 'Use familiar outlined icons across every admin workflow.', 'purple'],
            ['3', 'Color System', 'Reserve accent colors for status, ownership and action.', 'green'],
            ['4', 'Data Visualization', 'Use charts only when live platform data supports them.', 'blue'],
            ['5', 'Quick Filters', 'Make common application and enrollment reviews faster.', 'amber'],
            ['6', 'Dark Mode', 'A calm dark workspace keeps long admin sessions comfortable.', 'teal'],
          ].map(([number, title, text, color]) => (
            <article className="admin-recommendation" key={title}>
              <div className={`admin-recommendation-icon ${color}`}>{number}</div>
              <h3>{title}</h3>
              <p>{text}</p>
              <CheckCircle2 size={14} aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="admin-other-suggestions" aria-label="Other suggestions">
        <strong>Other Suggestions</strong>
        {['Add breadcrumbs for deep navigation', 'Improve mobile responsiveness', 'Add export reports', 'Add role-based access indicators', 'Add tooltips for actions', 'Improve empty states'].map(suggestion => <span key={suggestion}>• {suggestion}</span>)}
      </section>
    </div>
  )
}

// ── Users Section ──────────────────────────────────────────────────────────
function AdminUsers({ toast, onViewApplications }: { toast: (m: string, t?: ToastType) => void; onViewApplications: (query: string) => void }) {
  const { data: users, loading, error, reload } = useAdminData(fetchUsers)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [programmeFilter, setProgrammeFilter] = useState('ALL')
  const [openActions, setOpenActions] = useState<{ userId: string; top: number; left: number } | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  const isArchived = (u: Profile) => (u as { is_archived?: boolean }).is_archived === true
  const archivedCount = users.filter(isArchived).length
  const programmes = Array.from(new Set(users.map(user => user.diploma).filter((value): value is string => Boolean(value)))).sort()
  const filtered = users
    .filter(u => isArchived(u) === showArchived)
    .filter(u => statusFilter === 'ALL' || (u.request_status ?? 'PENDING') === statusFilter)
    .filter(u => roleFilter === 'ALL' || u.role === roleFilter)
    .filter(u => programmeFilter === 'ALL' || u.diploma === programmeFilter)
    .filter(u =>
      `${u.full_name} ${u.email} ${u.diploma ?? ''} ${u.identification_number ?? ''} ${u.residence ?? ''}`.toLowerCase().includes(q.toLowerCase())
    )

  const openActionMenu = (event: React.MouseEvent<HTMLButtonElement>, userId: string) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 190
    const menuHeight = 286
    const gap = 8
    const top = rect.bottom + menuHeight + gap <= window.innerHeight - 8
      ? rect.bottom + gap
      : rect.top - menuHeight - gap >= 8
        ? rect.top - menuHeight - gap
        : Math.max(8, Math.min(rect.bottom + gap, window.innerHeight - menuHeight - 8))
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8))
    setOpenActions(current => current?.userId === userId ? null : { userId, top, left })
  }

  const actionUser = openActions ? users.find(user => user.id === openActions.userId) : null

  useEffect(() => {
    if (!openActions) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.admin-action-menu-portal') && !target.closest('.admin-action-trigger')) setOpenActions(null)
    }
    const closeOnViewportChange = () => setOpenActions(null)
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    window.addEventListener('resize', closeOnViewportChange)
    window.addEventListener('scroll', closeOnViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      window.removeEventListener('resize', closeOnViewportChange)
      window.removeEventListener('scroll', closeOnViewportChange, true)
    }
  }, [openActions])

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const fd = new FormData(e.currentTarget)
    try {
      await updateUserProfile(editing.id, {
        full_name: (fd.get('full_name') as string) || editing.full_name,
        phone: ((fd.get('phone') as string) || '').trim() || undefined,
        diploma: ((fd.get('diploma') as string) || '').trim() || undefined,
        age: fd.get('age') ? Number(fd.get('age')) : undefined,
        languages: ((fd.get('languages') as string) || '').trim() || undefined,
        identification_number: ((fd.get('identification_number') as string) || '').trim() || undefined,
        residence: ((fd.get('residence') as string) || '').trim() || undefined,
        address: ((fd.get('address') as string) || '').trim() || undefined,
        country: ((fd.get('country') as string) || '').trim() || undefined,
        request_status: (fd.get('request_status') as Profile['request_status']) || 'PENDING',
      })
      await updateUserRole(editing.id, fd.get('role') as 'ADMIN' | 'STUDENT')
      toast('User updated successfully')
      setEditing(null)
      reload()
    } catch (err: unknown) {
      console.error('[admin] user update failed:', err)
      toast(getErrorMessage(err, 'Update failed'), 'error')
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Students</h1><p>Manage students, applicants, account requests and roles</p></div>
        <button className="admin-btn admin-btn-ghost" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? <UserCheck size={14} /> : <Archive size={14} />} {showArchived ? 'Show active students' : `Show archived (${archivedCount})`}
        </button>
      </div>
      <div className="admin-card admin-students-card">
        <div className="admin-card-header">
          <div className="admin-filter-bar admin-student-toolbar">
            <div className="admin-filter-search">
              <Search size={14} />
              <input placeholder="Search students…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <select className="admin-filter-select" aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
            </select>
            <select className="admin-filter-select" aria-label="Filter by role" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="ALL">All roles</option><option value="STUDENT">Student</option><option value="ADMIN">Admin</option>
            </select>
            <select className="admin-filter-select" aria-label="Filter by programme" value={programmeFilter} onChange={e => setProgrammeFilter(e.target.value)}>
              <option value="ALL">All programmes</option>{programmes.map(programme => <option key={programme} value={programme}>{programme}</option>)}
            </select>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={reload} title="Refresh students"><RefreshCw size={13} /> Refresh</button>
          </div>
          <span style={{ color: '#3a6070', fontSize: 12 }}>{filtered.length} {showArchived ? 'archived' : 'students'}</span>
        </div>
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : error ? <div className="admin-empty"><p>Could not load users: {error}</p><button className="admin-btn admin-btn-ghost" onClick={reload}>Retry</button></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Student</th><th>Contact</th><th>Programme</th><th>Location</th><th>Status</th><th>Role</th><th>Date</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8}><div className="admin-empty"><p>No users found.</p></div></td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id}>
                    <td><span className="admin-student-identity"><span className="admin-student-avatar">{u.full_name?.trim().split(/\s+/).map(name => name[0]).join('').slice(0, 2).toUpperCase() || '?'}</span><span><strong>{u.full_name}</strong><small>{u.email}</small></span></span></td>
                    <td><span className="admin-table-secondary">{u.phone ?? 'No phone'}<small>{u.email}</small></span></td>
                    <td><span className="admin-table-secondary">{u.diploma ?? 'Programme not set'}<small>{u.age ? `${u.age} years` : 'Age not set'}</small></span></td>
                    <td><span className="admin-table-secondary">{u.residence ?? 'Location not set'}<small>{u.country ?? ''}</small></span></td>
                    <td><StatusBadge status={u.request_status ?? 'PENDING'} /></td>
                    <td><StatusBadge status={u.role} /></td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-action-trigger" aria-label={`Actions for ${u.full_name}`} aria-expanded={openActions?.userId === u.id} onClick={event => openActionMenu(event, u.id)}><MoreVertical size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {actionUser && openActions && createPortal(
        <div className="admin-action-menu admin-action-menu-portal" role="menu" style={{ top: openActions.top, left: openActions.left }}>
          <button onClick={() => { setOpenActions(null); setEditing(actionUser) }}><Pencil size={13} /> Edit</button>
          {actionUser.role === 'STUDENT' && <button onClick={() => { setOpenActions(null); onViewApplications(actionUser.email) }}><ClipboardList size={13} /> View Applications</button>}
          {actionUser.role !== 'ADMIN' && <button onClick={() => { setOpenActions(null); setConfirm({ msg: `Promote ${actionUser.full_name} to ADMIN?`, fn: async () => { await updateUserRole(actionUser.id, 'ADMIN'); toast('Role updated'); reload(); setConfirm(null) } }) }}><UserCheck size={13} /> Make Admin</button>}
          {actionUser.request_status !== 'APPROVED' && <button onClick={() => { setOpenActions(null); setConfirm({ msg: `Approve the account request for ${actionUser.full_name}?`, fn: async () => { await updateUserProfile(actionUser.id, { request_status: 'APPROVED' }); toast('Your request approved'); reload(); setConfirm(null) } }) }}><CheckCheck size={13} /> Approve</button>}
          {actionUser.request_status !== 'REJECTED' && <button className="danger" onClick={() => { setOpenActions(null); setConfirm({ msg: `Reject the account request for ${actionUser.full_name}?`, fn: async () => { await updateUserProfile(actionUser.id, { request_status: 'REJECTED' }); toast('Application rejected'); reload(); setConfirm(null) } }) }}><XCircle size={13} /> Reject</button>}
          {actionUser.role === 'STUDENT' && <button onClick={() => { setOpenActions(null); setConfirm({ msg: isArchived(actionUser) ? `Restore ${actionUser.full_name} to the active student list?` : `Archive ${actionUser.full_name}? The account and its records are kept safe — archived students are hidden from the active list and can be restored at any time.`, fn: async () => { try { await updateStudentArchive(actionUser.id, !isArchived(actionUser), actionUser.full_name); toast(isArchived(actionUser) ? 'Student restored' : 'Student archived'); reload() } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Action failed', 'error') } setConfirm(null) } }) }}>{isArchived(actionUser) ? <ArchiveRestore size={13} /> : <Archive size={13} />} {isArchived(actionUser) ? 'Restore' : 'Archive'}</button>}
          {actionUser.role === 'STUDENT' && <button className="danger" onClick={() => { setOpenActions(null); setConfirm({ msg: `Permanently delete ${actionUser.full_name}? This removes the student's profile and can affect their enrolments and other linked records. This cannot be undone. If you only need to take them out of the active list, archive the student instead.`, fn: async () => { try { await deleteStudentProfile(actionUser.id, actionUser.full_name); toast('Student deleted'); reload() } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Delete failed', 'error') } setConfirm(null) } }) }}><Trash2 size={13} /> Delete</button>}
        </div>,
        document.body
      )}

      {editing && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Edit User</h2>
              <button className="admin-icon-btn" onClick={() => setEditing(null)}><X size={16} /></button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="admin-modal-body">
                <div className="admin-form-grid">
                  <div className="admin-field admin-field-full">
                    <label>Full Name</label>
                    <input name="full_name" defaultValue={editing.full_name} required />
                  </div>
                  <div className="admin-field">
                    <label>Phone</label>
                    <input name="phone" defaultValue={editing.phone ?? ''} />
                  </div>
                  <div className="admin-field">
                    <label>Role</label>
                    <select name="role" defaultValue={editing.role}>
                      <option value="STUDENT">STUDENT</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div className="admin-field">
                    <label>Request status</label>
                    <select name="request_status" defaultValue={editing.request_status ?? 'PENDING'}>
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div className="admin-field">
                    <label>Age</label>
                    <input name="age" type="number" defaultValue={String(editing.age ?? '')} />
                  </div>
                  <div className="admin-field">
                    <label>Diploma</label>
                    <input name="diploma" defaultValue={editing.diploma ?? ''} />
                  </div>
                  <div className="admin-field">
                    <label>Languages</label>
                    <input name="languages" defaultValue={editing.languages ?? ''} />
                  </div>
                  <div className="admin-field">
                    <label>Identification number</label>
                    <input name="identification_number" defaultValue={editing.identification_number ?? ''} />
                  </div>
                  <div className="admin-field">
                    <label>Residence</label>
                    <input name="residence" defaultValue={editing.residence ?? ''} />
                  </div>
                  <div className="admin-field">
                    <label>Country</label>
                    <input name="country" defaultValue={editing.country ?? ''} />
                  </div>
                  <div className="admin-field admin-field-full">
                    <label>Address</label>
                    <textarea name="address" defaultValue={editing.address ?? ''} rows={3} />
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── Courses Section ────────────────────────────────────────────────────────
function AdminCourses({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data: courses, loading, error, reload } = useAdminData(fetchCourses)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<Partial<import('./lib/supabase').Course> | null>(null)
  const [materialFile, setMaterialFile] = useState<UploadedFile | null>(null)
  const [coverFile, setCoverFile] = useState<UploadedFile | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  const filtered = courses.filter(c =>
    `${c.title} ${c.description}`.toLowerCase().includes(q.toLowerCase())
  )

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (modal === null) return
    const fd = new FormData(e.currentTarget)
    try {
      const savedCourse = await upsertCourse({
        ...modal,
        title: fd.get('title') as string,
        slug: (fd.get('title') as string).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description: fd.get('description') as string,
        duration: fd.get('duration') as string,
        price: parseFloat(fd.get('price') as string) || 0,
        image_url: fd.get('image_url') as string,
        is_published: (fd.get('is_published') as string) === 'true',
        is_featured: (fd.get('is_featured') as string) === 'true',
        objectives: [],
        requirements: [],
      })
      if (materialFile) {
        const finalPath = materialFile.path.startsWith('pending-course/') ? await moveStoredFile('course-files', materialFile.path, `courses/${savedCourse.id}/${materialFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`) : materialFile.path
        await upsertCourse({ id: savedCourse.id, material_path: finalPath, material_name: materialFile.name, material_type: materialFile.type, material_size: materialFile.size })
      }
      if (coverFile) {
        const finalPath = coverFile.path.startsWith('pending-cover/') ? await moveStoredFile('gallery', coverFile.path, `course-covers/${savedCourse.id}/${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`) : coverFile.path
        await upsertCourse({ id: savedCourse.id, cover_path: finalPath, image_url: getPublicFileUrl('gallery', finalPath) })
      }
      toast(modal.id ? 'Course updated' : 'Course created')
      setModal(null); setMaterialFile(null); setCoverFile(null)
      reload()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Courses</h1><p>Manage learning programs</p></div>
        <button className="admin-btn admin-btn-primary" onClick={() => setModal({})}>
          <Plus size={14} /> Add Course
        </button>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-filter-search">
            <Search size={14} />
            <input placeholder="Search courses…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <span style={{ color: '#3a6070', fontSize: 12 }}>{filtered.length} courses</span>
        </div>
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : error ? <div className="admin-empty"><p>Could not load courses: {error}</p><button className="admin-btn admin-btn-ghost" onClick={reload}>Retry</button></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Title</th><th>Duration</th><th>Price</th><th>Status</th><th>Featured</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6}><div className="admin-empty"><p>No courses found.</p></div></td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.title}</strong><small>{c.slug}</small></td>
                    <td>{c.duration}</td>
                    <td>RWF {Number(c.price).toLocaleString()}</td>
                    <td><StatusBadge status={c.is_published ? 'PUBLISHED' : 'DRAFT'} /></td>
                    <td>{c.is_featured ? <Star size={14} color="#f59e0b" /> : <StarOff size={14} color="#3a6070" />}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setModal(c)}><Pencil size={12} /></button>
                        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={async () => {
                          await toggleCoursePublished(c.id, !c.is_published)
                          toast(c.is_published ? 'Unpublished' : 'Published')
                          reload()
                        }}>{c.is_published ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={async () => {
                          await toggleCourseFeatured(c.id, !c.is_featured)
                          toast('Featured updated')
                          reload()
                        }}>{c.is_featured ? <StarOff size={12} /> : <Star size={12} />}</button>
                        <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setConfirm({
                          msg: `Delete "${c.title}"? This cannot be undone.`,
                          fn: async () => { await deleteCourse(c.id); toast('Course deleted'); reload(); setConfirm(null) }
                        })}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal admin-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modal.id ? 'Edit Course' : 'Add Course'}</h2>
              <button className="admin-icon-btn" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={save}>
              <div className="admin-modal-body">
                <div className="admin-form-grid">
                  <div className="admin-field admin-field-full">
                    <label>Title *</label>
                    <input name="title" defaultValue={modal.title ?? ''} required />
                  </div>
                  <div className="admin-field admin-field-full">
                    <label>Description *</label>
                    <textarea name="description" defaultValue={modal.description ?? ''} required />
                  </div>
                  <div className="admin-field">
                    <label>Duration</label>
                    <input name="duration" defaultValue={modal.duration ?? ''} placeholder="e.g. 2 days" />
                  </div>
                  <div className="admin-field">
                    <label>Price (RWF)</label>
                    <input name="price" type="number" defaultValue={modal.price ?? 0} />
                  </div>
                  <div className="admin-field admin-field-full">
                    <label>Image URL</label>
                    <input name="image_url" defaultValue={modal.image_url ?? ''} placeholder="https://…" />
                  </div>
                  <div className="admin-field admin-field-full"><label>Course Cover Image</label><FileUploader bucket="gallery" pathPrefix={modal.id ? `course-covers/${modal.id}` : 'pending-cover'} value={coverFile || (modal.cover_path ? { path: modal.cover_path, name: 'Current course cover', type: 'image/*', size: 0 } : null)} accept="image/jpeg,image/png,image/webp" maxBytes={10 * 1024 * 1024} onUploaded={setCoverFile} onRemoved={() => setCoverFile(null)} /></div>
                  <div className="admin-field admin-field-full">
                    <label>Course Materials</label>
                    <FileUploader bucket="course-files" pathPrefix={modal.id ? `courses/${modal.id}` : 'pending-course'} value={materialFile || (modal.material_path ? { path: modal.material_path, name: modal.material_name || 'Current course material', type: modal.material_type || 'file', size: modal.material_size || 0 } : null)} accept="application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.zip,image/jpeg,image/png" maxBytes={25 * 1024 * 1024} onUploaded={setMaterialFile} onRemoved={() => setMaterialFile(null)} />
                  </div>
                  <div className="admin-field">
                    <label>Published</label>
                    <select name="is_published" defaultValue={String(modal.is_published ?? false)}>
                      <option value="false">Draft</option>
                      <option value="true">Published</option>
                    </select>
                  </div>
                  <div className="admin-field">
                    <label>Featured</label>
                    <select name="is_featured" defaultValue={String(modal.is_featured ?? false)}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary">Save Course</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── Schedules ──────────────────────────────────────────────────────────────
function AdminSchedules({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchSchedules)
  const { data: courses } = useAdminData(fetchCourses)
  const [modal, setModal] = useState<Partial<import('./lib/supabase').CourseSchedule> | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (modal === null) return
    const fd = new FormData(e.currentTarget)
    const maxSeats = parseInt(fd.get('max_seats') as string) || 1
    const availSeats = parseInt(fd.get('available_seats') as string) || maxSeats
    try {
      await upsertSchedule({
        ...modal,
        course_id: fd.get('course_id') as string,
        starts_at: fd.get('starts_at') as string,
        ends_at: fd.get('ends_at') as string,
        location: fd.get('location') as string,
        trainer: fd.get('trainer') as string,
        max_seats: maxSeats,
        available_seats: Math.min(availSeats, maxSeats),
        status: fd.get('status') as string,
      })
      toast(modal.id ? 'Schedule updated' : 'Schedule created')
      setModal(null); reload()
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Save failed', 'error') }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Schedules</h1><p>Manage course schedules and seat availability</p></div>
        <button className="admin-btn admin-btn-primary" onClick={() => setModal({})}><Plus size={14} /> Add Schedule</button>
      </div>
      <div className="admin-card">
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Course</th><th>Start</th><th>End</th><th>Location</th><th>Seats</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data.length === 0 ? <tr><td colSpan={7}><div className="admin-empty"><p>No schedules yet.</p></div></td></tr>
                  : data.map((s: import('./lib/supabase').CourseSchedule & { courses?: { title: string } }) => (
                    <tr key={s.id}>
                      <td><strong>{s.courses?.title ?? s.course_id}</strong></td>
                      <td>{fmtDate(s.starts_at)}</td>
                      <td>{fmtDate(s.ends_at)}</td>
                      <td>{s.location}</td>
                      <td>{s.available_seats}/{s.max_seats}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setModal(s)}><Pencil size={12} /></button>
                          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setConfirm({
                            msg: 'Delete this schedule?',
                            fn: async () => { await deleteSchedule(s.id); toast('Deleted'); reload(); setConfirm(null) }
                          })}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal !== null && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modal.id ? 'Edit Schedule' : 'Add Schedule'}</h2>
              <button className="admin-icon-btn" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={save}>
              <div className="admin-modal-body">
                <div className="admin-form-grid">
                  <div className="admin-field admin-field-full">
                    <label>Course *</label>
                    <select name="course_id" defaultValue={modal.course_id ?? ''} required>
                      <option value="">Select course…</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="admin-field"><label>Start Date *</label><input name="starts_at" type="datetime-local" defaultValue={modal.starts_at?.slice(0, 16) ?? ''} required /></div>
                  <div className="admin-field"><label>End Date *</label><input name="ends_at" type="datetime-local" defaultValue={modal.ends_at?.slice(0, 16) ?? ''} required /></div>
                  <div className="admin-field"><label>Location *</label><input name="location" defaultValue={modal.location ?? ''} required /></div>
                  <div className="admin-field"><label>Trainer</label><input name="trainer" defaultValue={modal.trainer ?? ''} /></div>
                  <div className="admin-field"><label>Max Seats</label><input name="max_seats" type="number" min={1} defaultValue={modal.max_seats ?? 20} required /></div>
                  <div className="admin-field"><label>Available Seats</label><input name="available_seats" type="number" min={0} defaultValue={modal.available_seats ?? 20} /></div>
                  <div className="admin-field"><label>Status</label>
                    <select name="status" defaultValue={modal.status ?? 'OPEN'}>
                      {['OPEN','CLOSED','CANCELLED','COMPLETED'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── Enrollments ────────────────────────────────────────────────────────────
function AdminEnrollments({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchEnrollments)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filtered = data.filter(e => {
    const match = `${(e as { profiles?: { full_name?: string } }).profiles?.full_name} ${(e as { courses?: { title?: string } }).courses?.title}`.toLowerCase().includes(q.toLowerCase())
    return match && (statusFilter === 'ALL' || e.status === statusFilter)
  })

  async function changeStatus(id: string, status: string, studentId: string) {
    try {
      await updateEnrollmentStatus(id, status, studentId)
      toast(`Status updated to ${status}`)
      reload()
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Update failed', 'error') }
  }

  return (
    <div>
      <div className="admin-page-header"><div><h1>Enrollments</h1><p>Review and manage student enrollments</p></div></div>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-filter-bar">
            <div className="admin-filter-search"><Search size={14} /><input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} /></div>
            <select className="admin-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              {['PENDING','APPROVED','REJECTED','WAITLISTED','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Student</th><th>Course</th><th>Status</th><th>Applied</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={5}><div className="admin-empty"><p>No enrollments found.</p></div></td></tr>
                  : filtered.map(e => (
                    <tr key={e.id}>
                      <td><strong>{(e as { profiles?: { full_name?: string } }).profiles?.full_name ?? '—'}</strong><small>{(e as { profiles?: { email?: string } }).profiles?.email}</small></td>
                      <td>{(e as { courses?: { title?: string } }).courses?.title ?? '—'}</td>
                      <td><StatusBadge status={e.status} /></td>
                      <td>{fmtDate(e.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {e.status === 'PENDING' && <>
                            <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => changeStatus(e.id, 'APPROVED', e.student_id)}><CheckCheck size={11} /> Approve</button>
                            <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => changeStatus(e.id, 'REJECTED', e.student_id)}><XCircle size={11} /> Reject</button>
                            <button className="admin-btn admin-btn-warning admin-btn-sm" onClick={() => changeStatus(e.id, 'WAITLISTED', e.student_id)}><Clock size={11} /> Waitlist</button>
                          </>}
                          {e.status === 'APPROVED' && <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => changeStatus(e.id, 'COMPLETED', e.student_id)}><Award size={11} /> Complete</button>}
                          {!['CANCELLED','REJECTED'].includes(e.status) && <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => changeStatus(e.id, 'CANCELLED', e.student_id)}><Ban size={11} /> Cancel</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Certificates ───────────────────────────────────────────────────────────
function AdminCertificates({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchCertificates)
  const { data: users } = useAdminData(fetchUsers)
  const { data: courses } = useAdminData(fetchCourses)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<Partial<import('./lib/supabase').Certificate> | null>(null)
  const [certificateFile, setCertificateFile] = useState<UploadedFile | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  const filtered = data.filter(c =>
    `${(c as { profiles?: { full_name?: string } }).profiles?.full_name} ${c.certificate_number}`.toLowerCase().includes(q.toLowerCase())
  )

  async function openCertificate(c: import('./lib/supabase').Certificate) {
    if (!c.file_path) return
    try {
      const url = await createPrivateFileUrl('certificates', c.file_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Certificate file unavailable', 'error') }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (modal === null) return
    const fd = new FormData(e.currentTarget)
    try {
      const savedCertificate = await upsertCertificate({
        ...modal,
        student_id: fd.get('student_id') as string,
        course_id: fd.get('course_id') as string,
        certificate_number: fd.get('certificate_number') as string,
        verification_code: fd.get('verification_code') as string,
        issue_date: fd.get('issue_date') as string,
        status: fd.get('status') as string,
      })
      if (certificateFile) {
        const finalPath = certificateFile.path.startsWith('pending-certificate/') ? await moveStoredFile('certificates', certificateFile.path, `certificates/${savedCertificate.student_id}/${savedCertificate.id}/${certificateFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`) : certificateFile.path
        await upsertCertificate({ id: savedCertificate.id, file_path: finalPath, file_name: certificateFile.name, file_type: certificateFile.type, file_size: certificateFile.size })
      }
      toast(modal.id ? 'Certificate updated' : 'Certificate issued')
      setModal(null); setCertificateFile(null); reload()
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Save failed', 'error') }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Certificates</h1><p>Issue and manage certificates</p></div>
        <button className="admin-btn admin-btn-primary" onClick={() => setModal({})}><Plus size={14} /> Issue Certificate</button>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-filter-search"><Search size={14} /><input placeholder="Search certificates…" value={q} onChange={e => setQ(e.target.value)} /></div>
        </div>
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Student</th><th>Course</th><th>Certificate #</th><th>Issued</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={6}><div className="admin-empty"><p>No certificates found.</p></div></td></tr>
                  : filtered.map(c => (
                    <tr key={c.id}>
                      <td><strong>{(c as { profiles?: { full_name?: string } }).profiles?.full_name ?? '—'}</strong></td>
                      <td>{(c as { courses?: { title?: string } }).courses?.title ?? '—'}</td>
                      <td><code style={{ fontSize: 11, color: '#14b8c5' }}>{c.certificate_number}</code></td>
                      <td>{fmtDate(c.issue_date)}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setModal(c)}><Pencil size={12} /></button>
                            {c.file_path && <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => openCertificate(c)}><Eye size={12} /></button>}
                          {c.status !== 'REVOKED' && <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setConfirm({
                            msg: `Revoke certificate ${c.certificate_number}?`,
                            fn: async () => { await revokeCertificate(c.id); toast('Certificate revoked'); reload(); setConfirm(null) }
                          })}><Ban size={12} /> Revoke</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal !== null && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modal.id ? 'Edit Certificate' : 'Issue Certificate'}</h2>
              <button className="admin-icon-btn" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={save}>
              <div className="admin-modal-body">
                <div className="admin-form-grid">
                  <div className="admin-field"><label>Student *</label>
                    <select name="student_id" defaultValue={modal.student_id ?? ''} required>
                      <option value="">Select student…</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                  <div className="admin-field"><label>Course *</label>
                    <select name="course_id" defaultValue={modal.course_id ?? ''} required>
                      <option value="">Select course…</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="admin-field"><label>Certificate Number *</label><input name="certificate_number" defaultValue={modal.certificate_number ?? `CPGH-${Date.now()}`} required /></div>
                  <div className="admin-field"><label>Verification Code *</label><input name="verification_code" defaultValue={modal.verification_code ?? `VC-${Math.random().toString(36).slice(2,10).toUpperCase()}`} required /></div>
                  <div className="admin-field"><label>Issue Date</label><input name="issue_date" type="date" defaultValue={modal.issue_date ?? new Date().toISOString().slice(0,10)} /></div>
                  <div className="admin-field"><label>Status</label>
                    <select name="status" defaultValue={modal.status ?? 'VALID'}>
                      {['VALID','REVOKED','EXPIRED'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="admin-field admin-field-full"><label>Certificate File</label><FileUploader bucket="certificates" pathPrefix={modal.id ? `certificates/${modal.student_id || 'student'}/${modal.id}` : 'pending-certificate'} value={certificateFile || (modal.file_path ? { path: modal.file_path, name: modal.file_name || 'Current certificate', type: modal.file_type || 'application/pdf', size: modal.file_size || 0 } : null)} accept="application/pdf,.pdf" maxBytes={15 * 1024 * 1024} onUploaded={setCertificateFile} onRemoved={() => setCertificateFile(null)} /></div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── News ───────────────────────────────────────────────────────────────────
function AdminNews({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchNews)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<Partial<import('./lib/supabase').NewsItem> | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  const filtered = data.filter(n => `${n.title} ${n.category}`.toLowerCase().includes(q.toLowerCase()))

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (modal === null) return
    const fd = new FormData(e.currentTarget)
    const title = fd.get('title') as string
    try {
      await upsertNews({
        ...modal,
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        category: fd.get('category') as string,
        excerpt: fd.get('excerpt') as string,
        content: fd.get('content') as string,
        image_url: fd.get('image_url') as string,
        is_published: (fd.get('is_published') as string) === 'true',
      })
      toast(modal.id ? 'Article updated' : 'Article created')
      setModal(null); reload()
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Save failed', 'error') }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>News</h1><p>Manage articles and updates</p></div>
        <button className="admin-btn admin-btn-primary" onClick={() => setModal({})}><Plus size={14} /> Add Article</button>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-filter-search"><Search size={14} /><input placeholder="Search news…" value={q} onChange={e => setQ(e.target.value)} /></div>
        </div>
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={5}><div className="admin-empty"><p>No articles found.</p></div></td></tr>
                  : filtered.map(n => (
                    <tr key={n.id}>
                      <td><strong>{n.title}</strong></td>
                      <td>{n.category}</td>
                      <td><StatusBadge status={n.is_published ? 'PUBLISHED' : 'DRAFT'} /></td>
                      <td>{fmtDate(n.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setModal(n)}><Pencil size={12} /></button>
                          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={async () => { await toggleNewsPublished(n.id, !n.is_published); toast(n.is_published ? 'Unpublished' : 'Published'); reload() }}>{n.is_published ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setConfirm({ msg: `Delete "${n.title}"?`, fn: async () => { await deleteNews(n.id); toast('Deleted'); reload(); setConfirm(null) } })}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal !== null && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal admin-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header"><h2>{modal.id ? 'Edit Article' : 'Add Article'}</h2><button className="admin-icon-btn" onClick={() => setModal(null)}><X size={16} /></button></div>
            <form onSubmit={save}>
              <div className="admin-modal-body">
                <div className="admin-form-grid">
                  <div className="admin-field admin-field-full"><label>Title *</label><input name="title" defaultValue={modal.title ?? ''} required /></div>
                  <div className="admin-field"><label>Category</label><input name="category" defaultValue={modal.category ?? 'Insights'} /></div>
                  <div className="admin-field"><label>Status</label><select name="is_published" defaultValue={String(modal.is_published ?? false)}><option value="false">Draft</option><option value="true">Published</option></select></div>
                  <div className="admin-field admin-field-full"><label>Excerpt</label><textarea name="excerpt" defaultValue={modal.excerpt ?? ''} /></div>
                  <div className="admin-field admin-field-full"><label>Content</label><textarea name="content" defaultValue={modal.content ?? ''} style={{ minHeight: 140 }} /></div>
                  <div className="admin-field admin-field-full"><label>Image URL</label><input name="image_url" defaultValue={modal.image_url ?? ''} /></div>
                </div>
              </div>
              <div className="admin-modal-footer"><button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="admin-btn admin-btn-primary">Save</button></div>
            </form>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── Gallery ────────────────────────────────────────────────────────────────
function AdminGallery({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchGallery)
  const [modal, setModal] = useState<Partial<import('./lib/supabase').GalleryItem> | null>(null)
  const [galleryFile, setGalleryFile] = useState<UploadedFile | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (modal === null) return
    const fd = new FormData(e.currentTarget)
    try {
      const savedItem = await upsertGalleryItem({ ...modal, category: fd.get('category') as string, caption: fd.get('caption') as string, image_url: modal.image_url || 'pending' })
      if (galleryFile) {
        const finalPath = galleryFile.path.startsWith('pending-gallery/') ? await moveStoredFile('gallery', galleryFile.path, `gallery/${savedItem.id}/${galleryFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`) : galleryFile.path
        await upsertGalleryItem({ id: savedItem.id, image_path: finalPath, image_url: getPublicFileUrl('gallery', finalPath) })
      }
      toast(modal.id ? 'Item updated' : 'Item added')
      setModal(null); setGalleryFile(null); reload()
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Save failed', 'error') }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Gallery</h1><p>Manage photo gallery</p></div>
        <button className="admin-btn admin-btn-primary" onClick={() => setModal({})}><Plus size={14} /> Add Photo</button>
      </div>
      <div className="admin-card">
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, padding: 16 }}>
            {data.length === 0 ? <div className="admin-empty"><p>No gallery items.</p></div>
              : data.map(g => (
                <div key={g.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)' }}>
                  <img src={g.image_url} alt={g.caption ?? ''} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '8px 10px', background: '#0e1e2a' }}>
                    <small style={{ color: '#14b8c5', fontSize: 10 }}>{g.category}</small>
                    <p style={{ color: '#8aaab4', fontSize: 11, margin: '3px 0 6px' }}>{g.caption ?? '—'}</p>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setModal(g)}><Pencil size={11} /></button>
                      <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setConfirm({ msg: 'Delete this photo?', fn: async () => { await deleteGalleryItem(g.id); toast('Deleted'); reload(); setConfirm(null) } })}><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
      {modal !== null && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header"><h2>{modal.id ? 'Edit Photo' : 'Add Photo'}</h2><button className="admin-icon-btn" onClick={() => setModal(null)}><X size={16} /></button></div>
            <form onSubmit={save}>
              <div className="admin-modal-body">
                <div className="admin-form-grid single">
                  <div className="admin-field"><label>Gallery Image *</label><FileUploader bucket="gallery" pathPrefix={modal.id ? `gallery/${modal.id}` : 'pending-gallery'} value={galleryFile || (modal.image_path ? { path: modal.image_path, name: 'Current gallery image', type: 'image/*', size: 0 } : null)} accept="image/jpeg,image/png,image/webp" maxBytes={10 * 1024 * 1024} onUploaded={setGalleryFile} onRemoved={() => setGalleryFile(null)} /></div>
                  <div className="admin-field"><label>Category</label><input name="category" defaultValue={modal.category ?? 'General'} /></div>
                  <div className="admin-field"><label>Caption</label><input name="caption" defaultValue={modal.caption ?? ''} /></div>
                </div>
              </div>
              <div className="admin-modal-footer"><button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="admin-btn admin-btn-primary">Save</button></div>
            </form>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── Careers ────────────────────────────────────────────────────────────────
function AdminCareers({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchCareers)
  const [modal, setModal] = useState<Partial<import('./lib/supabase').Career> | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (modal === null) return
    const fd = new FormData(e.currentTarget)
    const title = fd.get('job_title') as string
    try {
      await upsertCareer({ ...modal, job_title: title, slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), department: fd.get('department') as string, location: fd.get('location') as string, employment_type: fd.get('employment_type') as string, description: fd.get('description') as string, requirements: [], is_published: (fd.get('is_published') as string) === 'true' })
      toast(modal.id ? 'Career updated' : 'Career created')
      setModal(null); reload()
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Save failed', 'error') }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Careers</h1><p>Manage job postings</p></div>
        <button className="admin-btn admin-btn-primary" onClick={() => setModal({})}><Plus size={14} /> Add Job</button>
      </div>
      <div className="admin-card">
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Title</th><th>Department</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data.length === 0 ? <tr><td colSpan={5}><div className="admin-empty"><p>No jobs posted.</p></div></td></tr>
                  : data.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.job_title}</strong><small>{c.location}</small></td>
                      <td>{c.department}</td>
                      <td>{c.employment_type}</td>
                      <td><StatusBadge status={c.is_published ? 'PUBLISHED' : 'DRAFT'} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setModal(c)}><Pencil size={12} /></button>
                          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={async () => { await toggleCareerPublished(c.id, !c.is_published); toast(c.is_published ? 'Unpublished' : 'Published'); reload() }}>{c.is_published ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setConfirm({ msg: `Delete "${c.job_title}"?`, fn: async () => { await deleteCareer(c.id); toast('Deleted'); reload(); setConfirm(null) } })}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal !== null && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal admin-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header"><h2>{modal.id ? 'Edit Job' : 'Add Job'}</h2><button className="admin-icon-btn" onClick={() => setModal(null)}><X size={16} /></button></div>
            <form onSubmit={save}>
              <div className="admin-modal-body">
                <div className="admin-form-grid">
                  <div className="admin-field admin-field-full"><label>Job Title *</label><input name="job_title" defaultValue={modal.job_title ?? ''} required /></div>
                  <div className="admin-field"><label>Department</label><input name="department" defaultValue={modal.department ?? ''} /></div>
                  <div className="admin-field"><label>Location</label><input name="location" defaultValue={modal.location ?? 'Kigali'} /></div>
                  <div className="admin-field"><label>Employment Type</label><select name="employment_type" defaultValue={modal.employment_type ?? 'Full-time'}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Volunteer</option></select></div>
                  <div className="admin-field"><label>Status</label><select name="is_published" defaultValue={String(modal.is_published ?? false)}><option value="false">Draft</option><option value="true">Published</option></select></div>
                  <div className="admin-field admin-field-full"><label>Description</label><textarea name="description" defaultValue={modal.description ?? ''} style={{ minHeight: 120 }} /></div>
                </div>
              </div>
              <div className="admin-modal-footer"><button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="admin-btn admin-btn-primary">Save</button></div>
            </form>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── Job Applications ───────────────────────────────────────────────────────
function AdminJobApplications({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchJobApplications)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [viewing, setViewing] = useState<import('./lib/supabase').JobApplication | null>(null)

  const filtered = data.filter(a => {
    const match = `${a.full_name} ${a.email}`.toLowerCase().includes(q.toLowerCase())
    return match && (statusFilter === 'ALL' || a.status === statusFilter)
  })

  async function changeStatus(id: string, status: string) {
    try { await updateJobApplicationStatus(id, status); toast(`Status: ${status}`); reload() }
    catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  async function openResume(application: import('./lib/supabase').JobApplication) {
    if (!application.resume_path) return
    try {
      const url = await createPrivateFileUrl('career-files', application.resume_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Resume unavailable', 'error') }
  }

  return (
    <div>
      <div className="admin-page-header"><div><h1>Job Applications</h1><p>Review applicants for open positions</p></div></div>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-filter-bar">
            <div className="admin-filter-search"><Search size={14} /><input placeholder="Search applicants…" value={q} onChange={e => setQ(e.target.value)} /></div>
            <select className="admin-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">All</option>
              {['NEW','REVIEWING','ACCEPTED','REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Applicant</th><th>Position</th><th>Status</th><th>Applied</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={5}><div className="admin-empty"><p>No applications found.</p></div></td></tr>
                  : filtered.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.full_name}</strong><small>{a.email}</small></td>
                      <td>{(a as { careers?: { job_title?: string } }).careers?.job_title ?? '—'}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>{fmtDate(a.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setViewing(a)}><Eye size={12} /></button>
                          {a.status === 'NEW' && <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => changeStatus(a.id, 'REVIEWING')}>Review</button>}
                          {a.status !== 'ACCEPTED' && <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => changeStatus(a.id, 'ACCEPTED')}><CheckCheck size={11} /></button>}
                          {a.status !== 'REJECTED' && <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => changeStatus(a.id, 'REJECTED')}><XCircle size={11} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {viewing && (
        <div className="admin-modal-overlay" onClick={() => setViewing(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header"><h2>Application Details</h2><button className="admin-icon-btn" onClick={() => setViewing(null)}><X size={16} /></button></div>
            <div className="admin-modal-body" style={{ display: 'grid', gap: 12 }}>
              {[['Name', viewing.full_name], ['Email', viewing.email], ['Phone', viewing.phone ?? '—'], ['Resume', viewing.resume_name ?? viewing.resume_url ?? '—'], ['Cover Message', viewing.cover_message]].map(([k, v]) => (
                <div key={k}><small style={{ color: '#3a6070', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{k}</small><p style={{ color: '#e0eef2', margin: '4px 0 0', fontSize: 14 }}>{v}</p></div>
              ))}
              {viewing.resume_path && <button className="admin-btn admin-btn-primary" onClick={() => openResume(viewing)}>View / Download Resume</button>}
            </div>
            <div className="admin-modal-footer"><button className="admin-btn admin-btn-ghost" onClick={() => setViewing(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Home Care Services ─────────────────────────────────────────────────────
function AdminHomecareServices({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchHomecareServices)
  const [modal, setModal] = useState<Partial<import('./lib/supabase').HomecareService> | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (modal === null) return
    const fd = new FormData(e.currentTarget)
    try {
      await upsertHomecareService({ ...modal, name: fd.get('name') as string, description: fd.get('description') as string, is_active: (fd.get('is_active') as string) === 'true' })
      toast(modal.id ? 'Service updated' : 'Service created')
      setModal(null); reload()
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Save failed', 'error') }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Home Care Services</h1><p>Manage available home care services</p></div>
        <button className="admin-btn admin-btn-primary" onClick={() => setModal({})}><Plus size={14} /> Add Service</button>
      </div>
      <div className="admin-card">
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data.length === 0 ? <tr><td colSpan={4}><div className="admin-empty"><p>No services yet.</p></div></td></tr>
                  : data.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      <td style={{ maxWidth: 300 }}>{s.description}</td>
                      <td><StatusBadge status={s.is_active ? 'ACTIVE' : 'INACTIVE'} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setModal(s)}><Pencil size={12} /></button>
                          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setConfirm({ msg: `Delete "${s.name}"?`, fn: async () => { await deleteHomecareService(s.id); toast('Deleted'); reload(); setConfirm(null) } })}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal !== null && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header"><h2>{modal.id ? 'Edit Service' : 'Add Service'}</h2><button className="admin-icon-btn" onClick={() => setModal(null)}><X size={16} /></button></div>
            <form onSubmit={save}>
              <div className="admin-modal-body">
                <div className="admin-form-grid single">
                  <div className="admin-field"><label>Name *</label><input name="name" defaultValue={modal.name ?? ''} required /></div>
                  <div className="admin-field"><label>Description</label><textarea name="description" defaultValue={modal.description ?? ''} /></div>
                  <div className="admin-field"><label>Status</label><select name="is_active" defaultValue={String(modal.is_active ?? true)}><option value="true">Active</option><option value="false">Inactive</option></select></div>
                </div>
              </div>
              <div className="admin-modal-footer"><button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="admin-btn admin-btn-primary">Save</button></div>
            </form>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── Home Care Requests ─────────────────────────────────────────────────────
function AdminHomecareRequests({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchHomecareRequests)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filtered = data.filter(r => {
    const match = `${r.name} ${r.email ?? ''} ${r.location}`.toLowerCase().includes(q.toLowerCase())
    return match && (statusFilter === 'ALL' || r.status === statusFilter)
  })

  async function changeStatus(id: string, status: string) {
    try { await updateHomecareRequestStatus(id, status); toast(`Status: ${status}`); reload() }
    catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  return (
    <div>
      <div className="admin-page-header"><div><h1>Home Care Requests</h1><p>Manage incoming home care requests</p></div></div>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-filter-bar">
            <div className="admin-filter-search"><Search size={14} /><input placeholder="Search requests…" value={q} onChange={e => setQ(e.target.value)} /></div>
            <select className="admin-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">All</option>
              {['NEW','REVIEWING','CONFIRMED','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Phone</th><th>Service</th><th>Location</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={7}><div className="admin-empty"><p>No requests found.</p></div></td></tr>
                  : filtered.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong><small>{r.email ?? '—'}</small></td>
                      <td>{r.phone}</td>
                      <td>{(r as { homecare_services?: { name?: string } }).homecare_services?.name ?? '—'}</td>
                      <td>{r.location}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{fmtDate(r.preferred_date ?? r.created_at)}</td>
                      <td>
                        <select className="admin-filter-select" style={{ height: 28, fontSize: 11 }} value={r.status} onChange={e => changeStatus(r.id, e.target.value)}>
                          {['NEW','REVIEWING','CONFIRMED','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Contact Messages ───────────────────────────────────────────────────────
function AdminContactMessages({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchContactMessages)
  const [q, setQ] = useState('')
  const [viewing, setViewing] = useState<import('./lib/supabase').ContactMessage | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  const filtered = data.filter(m => `${m.name} ${m.email} ${m.subject}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <div className="admin-page-header"><div><h1>Contact Messages</h1><p>Messages from the contact form</p></div></div>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-filter-search"><Search size={14} /><input placeholder="Search messages…" value={q} onChange={e => setQ(e.target.value)} /></div>
        </div>
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>From</th><th>Subject</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={5}><div className="admin-empty"><p>No messages.</p></div></td></tr>
                  : filtered.map(m => (
                    <tr key={m.id}>
                      <td><strong>{m.name}</strong><small>{m.email}</small></td>
                      <td>{m.subject}</td>
                      <td><StatusBadge status={m.status} /></td>
                      <td>{fmtDate(m.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={async () => { setViewing(m); if (m.status === 'NEW') { await updateContactMessageStatus(m.id, 'READ'); reload() } }}><Eye size={12} /></button>
                          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setConfirm({ msg: 'Delete this message?', fn: async () => { await deleteContactMessage(m.id); toast('Deleted'); reload(); setConfirm(null) } })}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {viewing && (
        <div className="admin-modal-overlay" onClick={() => setViewing(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header"><h2>{viewing.subject}</h2><button className="admin-icon-btn" onClick={() => setViewing(null)}><X size={16} /></button></div>
            <div className="admin-modal-body" style={{ display: 'grid', gap: 12 }}>
              {[['From', viewing.name], ['Email', viewing.email], ['Phone', viewing.phone ?? '—'], ['Message', viewing.message]].map(([k, v]) => (
                <div key={k}><small style={{ color: '#3a6070', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{k}</small><p style={{ color: '#e0eef2', margin: '4px 0 0', fontSize: 14, lineHeight: 1.6 }}>{v}</p></div>
              ))}
            </div>
            <div className="admin-modal-footer"><button className="admin-btn admin-btn-ghost" onClick={() => setViewing(null)}>Close</button></div>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── Partnership Requests ───────────────────────────────────────────────────
function AdminPartnershipRequests({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchPartnershipRequests)
  const [q, setQ] = useState('')
  const [viewing, setViewing] = useState<import('./lib/supabase').PartnershipRequest | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  const filtered = data.filter(r => `${r.organization_name} ${r.contact_person} ${r.email}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <div className="admin-page-header"><div><h1>Partnership Requests</h1><p>Incoming partnership inquiries</p></div></div>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-filter-search"><Search size={14} /><input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} /></div>
        </div>
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Organization</th><th>Contact</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={6}><div className="admin-empty"><p>No requests.</p></div></td></tr>
                  : filtered.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.organization_name}</strong></td>
                      <td>{r.contact_person}<small>{r.email}</small></td>
                      <td>{r.partnership_type}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{fmtDate(r.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setViewing(r)}><Eye size={12} /></button>
                          <select className="admin-filter-select" style={{ height: 28, fontSize: 11 }} value={r.status} onChange={async e => { await updatePartnershipStatus(r.id, e.target.value); toast('Status updated'); reload() }}>
                            {['NEW','REVIEWING','APPROVED','REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setConfirm({ msg: 'Delete this request?', fn: async () => { await deletePartnershipRequest(r.id); toast('Deleted'); reload(); setConfirm(null) } })}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {viewing && (
        <div className="admin-modal-overlay" onClick={() => setViewing(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header"><h2>{viewing.organization_name}</h2><button className="admin-icon-btn" onClick={() => setViewing(null)}><X size={16} /></button></div>
            <div className="admin-modal-body" style={{ display: 'grid', gap: 12 }}>
              {[['Organization', viewing.organization_name], ['Contact', viewing.contact_person], ['Email', viewing.email], ['Phone', viewing.phone ?? '—'], ['Type', viewing.partnership_type], ['Message', viewing.message]].map(([k, v]) => (
                <div key={k}><small style={{ color: '#3a6070', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{k}</small><p style={{ color: '#e0eef2', margin: '4px 0 0', fontSize: 14, lineHeight: 1.6 }}>{v}</p></div>
              ))}
            </div>
            <div className="admin-modal-footer"><button className="admin-btn admin-btn-ghost" onClick={() => setViewing(null)}>Close</button></div>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── Notifications ──────────────────────────────────────────────────────────
function AdminNotifications({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchNotifications)
  const { data: users } = useAdminData(fetchUsers)
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null)

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await createNotification({ user_id: fd.get('user_id') as string, title: fd.get('title') as string, message: fd.get('message') as string, type: fd.get('type') as string })
      toast('Notification sent')
      setModal(false); reload()
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div><h1>Notifications</h1><p>System and user notifications</p></div>
        <button className="admin-btn admin-btn-primary" onClick={() => setModal(true)}><Plus size={14} /> Send Notification</button>
      </div>
      <div className="admin-card">
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>User</th><th>Title</th><th>Type</th><th>Read</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {data.length === 0 ? <tr><td colSpan={6}><div className="admin-empty"><p>No notifications.</p></div></td></tr>
                  : data.map(n => (
                    <tr key={n.id}>
                      <td>{(n as { profiles?: { full_name?: string } }).profiles?.full_name ?? '—'}</td>
                      <td><strong>{n.title}</strong><small>{n.message}</small></td>
                      <td><span className="admin-badge badge-blue">{n.type}</span></td>
                      <td>{n.read_at ? <span className="admin-badge badge-green">Read</span> : <span className="admin-badge badge-amber">Unread</span>}</td>
                      <td>{fmtDate(n.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {!n.read_at && <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={async () => { await markNotificationRead(n.id); reload() }}><CheckCheck size={12} /></button>}
                          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setConfirm({ msg: 'Delete this notification?', fn: async () => { await deleteNotification(n.id); toast('Deleted'); reload(); setConfirm(null) } })}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header"><h2>Send Notification</h2><button className="admin-icon-btn" onClick={() => setModal(false)}><X size={16} /></button></div>
            <form onSubmit={send}>
              <div className="admin-modal-body">
                <div className="admin-form-grid single">
                  <div className="admin-field"><label>User *</label><select name="user_id" required><option value="">Select user…</option>{users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select></div>
                  <div className="admin-field"><label>Title *</label><input name="title" required /></div>
                  <div className="admin-field"><label>Message *</label><textarea name="message" required /></div>
                  <div className="admin-field"><label>Type</label><select name="type"><option value="SYSTEM">SYSTEM</option><option value="ENROLLMENT">ENROLLMENT</option><option value="CERTIFICATE">CERTIFICATE</option><option value="GENERAL">GENERAL</option></select></div>
                </div>
              </div>
              <div className="admin-modal-footer"><button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModal(false)}>Cancel</button><button type="submit" className="admin-btn admin-btn-primary">Send</button></div>
            </form>
          </div>
        </div>
      )}
      {confirm && <ConfirmDialog message={confirm.msg} onConfirm={confirm.fn} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── Site Settings ──────────────────────────────────────────────────────────
function AdminSiteSettings({ toast }: { toast: (m: string, t?: ToastType) => void }) {
  const { data, loading, reload } = useAdminData(fetchSiteSettings)
  const [editing, setEditing] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  async function save(key: string, raw: string) {
    try {
      let parsed: Record<string, unknown>
      try { parsed = JSON.parse(raw) } catch { parsed = { value: raw } }
      await upsertSiteSetting(key, parsed)
      toast('Setting saved')
      setEditing(null); reload()
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Save failed', 'error') }
  }

  async function addNew() {
    if (!newKey.trim()) return
    await save(newKey.trim(), newVal || '{}')
    setNewKey(''); setNewVal('')
  }

  return (
    <div>
      <div className="admin-page-header"><div><h1>Site Settings</h1><p>Configure website settings</p></div></div>
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="admin-card-header"><h2>Add New Setting</h2></div>
        <div style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="admin-filter-search" style={{ flex: 1, minWidth: 160, padding: '0 12px', height: 36, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#fff', fontSize: 13 }} placeholder="Setting key" value={newKey} onChange={e => setNewKey(e.target.value)} />
          <input className="admin-filter-search" style={{ flex: 2, minWidth: 200, padding: '0 12px', height: 36, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#fff', fontSize: 13 }} placeholder='Value (JSON or plain text)' value={newVal} onChange={e => setNewVal(e.target.value)} />
          <button className="admin-btn admin-btn-primary" onClick={addNew}><Plus size={14} /> Add</button>
        </div>
      </div>
      <div className="admin-card">
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Key</th><th>Value</th><th>Updated</th><th>Actions</th></tr></thead>
              <tbody>
                {data.length === 0 ? <tr><td colSpan={4}><div className="admin-empty"><p>No settings configured.</p></div></td></tr>
                  : data.map(s => (
                    <tr key={s.key}>
                      <td><code style={{ color: '#14b8c5', fontSize: 12 }}>{s.key}</code></td>
                      <td>
                        {editing === s.key ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input defaultValue={JSON.stringify(s.value)} id={`setting-${s.key}`} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 12, flex: 1 }} />
                            <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => { const el = document.getElementById(`setting-${s.key}`) as HTMLInputElement; save(s.key, el.value) }}>Save</button>
                            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                          </div>
                        ) : <code style={{ fontSize: 11, color: '#8aaab4' }}>{JSON.stringify(s.value).slice(0, 80)}</code>}
                      </td>
                      <td>{fmtDate(s.updated_at)}</td>
                      <td>{editing !== s.key && <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setEditing(s.key)}><Pencil size={12} /></button>}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Audit Logs ─────────────────────────────────────────────────────────────
function AdminAuditLogs() {
  const { data, loading } = useAdminData(fetchAuditLogs)
  const [q, setQ] = useState('')

  const filtered = data.filter(l => `${l.action} ${l.entity} ${(l as { profiles?: { full_name?: string } }).profiles?.full_name ?? ''}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <div className="admin-page-header"><div><h1>Audit Logs</h1><p>Record of all administrative actions</p></div></div>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-filter-search"><Search size={14} /><input placeholder="Search logs…" value={q} onChange={e => setQ(e.target.value)} /></div>
          <span style={{ color: '#3a6070', fontSize: 12 }}>{filtered.length} entries</span>
        </div>
        {loading ? <div className="admin-loading"><div className="admin-spinner" /></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th><th>Date</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={5}><div className="admin-empty"><p>No logs found.</p></div></td></tr>
                  : filtered.map(l => (
                    <tr key={l.id}>
                      <td>{(l as { profiles?: { full_name?: string } }).profiles?.full_name ?? <span style={{ color: '#3a6070' }}>System</span>}</td>
                      <td><span className="admin-badge badge-cyan">{l.action}</span></td>
                      <td><code style={{ fontSize: 11, color: '#8aaab4' }}>{l.entity}</code></td>
                      <td><code style={{ fontSize: 10, color: '#3a6070' }}>{JSON.stringify(l.metadata).slice(0, 60)}</code></td>
                      <td>{fmtDate(l.created_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Admin Component ───────────────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [showPwChange, setShowPwChange] = useState(false)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [applicationsQuery, setApplicationsQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const { toasts, show: showToast } = useToast()
  const brand = useSiteContent('brand', BRAND_DEFAULTS)

  useEffect(() => {
    if (!supabase) { navigate('/login', { replace: true }); return }
    const { data: authListener } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true })
      }
    })
    getCurrentProfile().then(p => {
      if (!p || !isAdminRole(p.role)) { navigate('/login'); return }
      setProfile(p)
      setAuthChecked(true)
      if (supabase) {
        supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null)
          .then(({ count }) => setUnreadCount(count ?? 0))
      }
    }).catch(() => navigate('/login', { replace: true }))
    return () => authListener.subscription.unsubscribe()
  }, [navigate])

  async function handleLogout() {
    await supabase?.auth.signOut()
    navigate('/login', { replace: true })
  }

  function navTo(key: string) {
    setActiveSection(key)
    setSidebarOpen(false)
  }

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1520', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="admin-loading"><div className="admin-spinner" /><span style={{ color: '#3a6070' }}>Verifying access…</span></div>
      </div>
    )
  }

  if (showPwChange) {
    return <PasswordChangePage onDone={() => setShowPwChange(false)} />
  }

  const sections: Record<string, React.ReactNode> = {
    dashboard: <AdminDashboard onNav={navTo} profile={profile} />,
    users: <AdminUsers toast={showToast} onViewApplications={query => { setApplicationsQuery(query); navTo('applications') }} />,
    applications: <AdminApplications toast={showToast} initialQuery={applicationsQuery} />,
    documents: <AdminDocuments toast={showToast} />,
    courses: <AdminCourses toast={showToast} />,
    schedules: <AdminSchedules toast={showToast} />,
    enrollments: <AdminEnrollments toast={showToast} />,
    certificates: <AdminCertificates toast={showToast} />,
    'website-content': <AdminWebsiteContent toast={showToast} />,
    news: <AdminNews toast={showToast} />,
    gallery: <AdminGallery toast={showToast} />,
    careers: <AdminCareers toast={showToast} />,
    'job-applications': <AdminJobApplications toast={showToast} />,
    'homecare-services': <AdminHomecareServices toast={showToast} />,
    'homecare-requests': <AdminHomecareRequests toast={showToast} />,
    'contact-messages': <AdminContactMessages toast={showToast} />,
    'partnership-requests': <AdminPartnershipRequests toast={showToast} />,
    notifications: <AdminNotifications toast={showToast} />,
    'site-settings': <AdminSiteSettings toast={showToast} />,
    'audit-logs': <AdminAuditLogs />,
  }

  const currentLabel = NAV_ITEMS.find(n => n.key === activeSection)?.label ?? 'Admin'
  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'AD'

  // Group nav items by section
  const sections_order = ['OVERVIEW', 'PEOPLE', 'LEARNING', 'CONTENT', 'HOME CARE', 'INBOX', 'SYSTEM']
  const grouped = sections_order.map(sec => ({
    section: sec,
    items: NAV_ITEMS.filter(n => n.section === sec)
  }))

  return (
    <div className="admin-shell">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 99 }} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <div className="admin-sidebar-brand">
          <Link to="/" className="brand" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            {brand.logoUrl
              ? <img src={brand.logoUrl} alt="CarePath Training Institute" style={{ height: 34, maxWidth: 120, objectFit: 'contain' }} />
              : <span className="brand-mark"><HeartPulse size={18} /></span>}
            <span style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
              CarePath Training Institute
            </span>
          </Link>
        </div>
        <div className="admin-sidebar-role">Admin Portal</div>
        <nav className="admin-nav">
          {grouped.map(g => (
            <div key={g.section}>
              <div className="admin-nav-section">{g.section}</div>
              {g.items.map(item => (
                <button
                  key={item.key}
                  className={`admin-nav-item ${activeSection === item.key ? 'active' : ''}`}
                  onClick={() => navTo(item.key)}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <ChevronLeft size={16} /><span>Collapse Menu</span>
          </button>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={16} /><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`admin-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Topbar */}
        <header className="admin-topbar">
          <button className="admin-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={18} />
          </button>
          <span className="admin-topbar-title">{currentLabel}</span>
          <nav className="admin-public-nav" aria-label="Public site navigation">
            {[['Home', '/'], ['Home Care', '/home-care'], ['Courses', '/courses'], ['Admissions', '/admissions'], ['Enroll', '/admissions/apply'], ['Careers', '/careers'], ['About', '/about'], ['News', '/news'], ['Contact', '/contact']].map(([label, path]) => <Link key={path} to={path}>{label}</Link>)}
          </nav>
          <div className="admin-search" style={{ flex: 1, maxWidth: 320, position: 'relative' }}>
            <Search size={14} />
            <input
              placeholder="Search sections…"
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && globalSearch.trim()) {
                  const match = NAV_ITEMS.find(n => n.label.toLowerCase().includes(globalSearch.toLowerCase()))
                  if (match) { navTo(match.key); setGlobalSearch('') }
                }
              }}
            />
            {globalSearch && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0e1e2a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, zIndex: 60, overflow: 'hidden', marginTop: 4, boxShadow: '0 12px 30px rgba(0,0,0,.4)' }}>
                {NAV_ITEMS.filter(n => n.label.toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 6).map(n => (
                  <button key={n.key} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 0, color: '#b0c8d0', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(20,184,197,.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => { navTo(n.key); setGlobalSearch('') }}>
                    <n.icon size={14} />{n.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="admin-topbar-actions">
            <ThemeToggle />
            <button className="admin-icon-btn" onClick={() => navTo('notifications')} title="Notifications" style={{ position: 'relative' }}>
              <Bell size={16} />
              {unreadCount > 0 && <span className="admin-notif-badge" />}
            </button>
            <button className="admin-profile-btn" onClick={() => setShowPwChange(true)}>
              <div className="admin-profile-avatar">{initials}</div>
              <span>{profile?.full_name?.split(' ')[0] ?? 'Admin'}</span>
              <ChevronDown size={13} />
            </button>
            <button className="admin-icon-btn" onClick={handleLogout} title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="admin-content">
          {sections[activeSection] ?? <div className="admin-empty"><p>Section not found.</p></div>}
        </main>
      </div>

      <ToastContainer toasts={toasts} onClose={() => {}} />
    </div>
  )
}
