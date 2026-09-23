import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSiteContent, CONTACT_DEFAULTS, ABOUT_DEFAULTS, HOMECARE_DEFAULTS, ADMISSIONS_DEFAULTS, ENROLL_DEFAULTS, HOME_DEFAULTS } from '../lib/siteContent'
import { LANGS, STARTERS, UI, PUBLIC_SITE_URL, isLang, type Lang } from '../lib/assistantI18n'
import { detectLang, getOfflineAnswer, sanitizeAssistantText, type AssistantContext } from '../lib/assistantKnowledge'

type Msg = { role: 'user' | 'assistant'; text: string }

const LS_LANG = 'cpg-ai-lang'
const LS_MANUAL = 'cpg-ai-lang-manual'
const MAX_MSGS = 8
const MAX_LEN = 1500

function readInitialLang(): Lang {
  try {
    const stored = sessionStorage.getItem(LS_LANG)
    if (isLang(stored)) return stored
  } catch { /* sessionStorage unavailable */ }
  return 'en'
}

function readManual(): boolean {
  try {
    return sessionStorage.getItem(LS_MANUAL) === '1'
  } catch {
    return false
  }
}

/** Renders assistant text, turning [[Label|/path]] markers into in-app links. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[\[([^\]]+)\]\]$/)
        if (m) {
          const [label, path] = m[1].split('|')
          if (path && path.startsWith('/') && !path.startsWith('//')) {
            return <Link key={i} to={path} className="ai-link">{label}</Link>
          }
          if (path && /^https?:\/\//i.test(path)) {
            return <a key={i} href={path} target="_blank" rel="noopener noreferrer" className="ai-link">{label}</a>
          }
          return <span key={i}>{label}</span>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export default function AiAssistant() {
  const location = useLocation()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState<Lang>(readInitialLang)
  const [manual, setManual] = useState<boolean>(readManual)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)

  // Live PUBLIC content from the CMS — the assistant's source of truth, so it
  // reflects real site data instead of hardcoded duplicates. Admin/student data
  // is never read here: only the public content.* areas.
  const contact = useSiteContent('content.contact', CONTACT_DEFAULTS)
  const about = useSiteContent('content.about', ABOUT_DEFAULTS)
  const homecare = useSiteContent('content.homecare', HOMECARE_DEFAULTS)
  const admissions = useSiteContent('content.admissions', ADMISSIONS_DEFAULTS)
  const enroll = useSiteContent('content.enroll', ENROLL_DEFAULTS)
  const home = useSiteContent('content.home', HOME_DEFAULTS)

  const context = useMemo<AssistantContext>(() => ({
    email: contact.email,
    base: contact.base,
    siteUrl: PUBLIC_SITE_URL,
    aboutTitle: about.title,
    aboutText: about.text,
    aboutMission: about.mission,
    aboutVision: about.vision,
    homecareTitle: homecare.title,
    homecareText: homecare.text,
    homecareServices: homecare.services,
    coursesHint: home.heroEyebrow,
    admissionsText: admissions.overview.text,
    howToApplyText: admissions.howToApply.text,
    entryRequirementsText: admissions.entryRequirements.text,
    importantDatesText: admissions.importantDates.text,
    enrollText: enroll.welcomeText,
  }), [contact.email, contact.base, about.title, about.text, about.mission, about.vision, homecare.title, homecare.text, homecare.services, home.heroEyebrow, admissions.overview.text, admissions.howToApply.text, admissions.entryRequirements.text, admissions.importantDates.text, enroll.welcomeText])

  const isPublicPage = !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/dashboard')
  const strings = UI[lang]

  // Seed the greeting whenever the conversation is empty / language changes.
  useEffect(() => {
    setMessages((prev) => (prev.length === 0 ? [{ role: 'assistant', text: UI[lang].greeting }] : prev))
  }, [lang])

  const openPanel = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    setMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)))
  }, [])

  const closePanel = useCallback(() => {
    setOpen(false)
    closeTimer.current = window.setTimeout(() => setMounted(false), 220)
  }, [])

  const toggle = useCallback(() => {
    if (open) closePanel()
    else openPanel()
  }, [open, openPanel, closePanel])

  // Keyboard: Escape closes. Focus management for accessibility.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closePanel()
        fabRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const t = window.setTimeout(() => inputRef.current?.focus(), 240)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(t)
    }
  }, [open, closePanel])

  // Keep the message log scrolled to the newest message.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [messages, busy])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const chooseLang = (code: Lang) => {
    setLang(code)
    setManual(true)
    try {
      sessionStorage.setItem(LS_LANG, code)
      sessionStorage.setItem(LS_MANUAL, '1')
    } catch { /* ignore persistence errors */ }
  }

  const ask = useCallback(async (raw: string, effectiveLang: Lang) => {
    const text = raw.trim()
    if (!text || busy) return

    const history: Msg[] = [...messages, { role: 'user', text }]
    setMessages(history)
    setInput('')
    setBusy(true)

    let reply = ''
    try {
      if (supabase) {
        const payload = history
          .slice(-MAX_MSGS)
          .map((m) => ({ role: m.role, content: m.text.slice(0, MAX_LEN) }))
        const { data, error } = await supabase.functions.invoke('ai-assistant', {
          body: { messages: payload, language: effectiveLang, context },
        })
        if (!error && data && typeof (data as { reply?: unknown }).reply === 'string') {
          reply = (data as { reply: string }).reply.trim()
        }
      }
    } catch {
      reply = ''
    }

    if (!reply) reply = getOfflineAnswer(text, effectiveLang, context)
    // Harden the reply before display: never leak a dev/localhost URL and keep
    // links on our own site as internal routes that resolve in production.
    reply = sanitizeAssistantText(reply, context.siteUrl)
    setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
    setBusy(false)
  }, [busy, messages, context])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    const effective = manual ? lang : (detectLang(text) ?? lang)
    if (!manual && detectLang(text) && detectLang(text) !== lang) setLang(detectLang(text) as Lang)
    void ask(text, effective)
  }

  const onStarter = (question: string) => {
    const effective = manual ? lang : (detectLang(question) ?? lang)
    void ask(question, effective)
  }

  // Only render on visitor-facing pages.
  if (!isPublicPage) return null

  const showStarters = messages.length <= 1 && !busy

  return (
    <>
      {mounted && (
      <div className={`ai-panel ${open ? 'ai-open' : ''}`} role="dialog" aria-modal="false" aria-label={strings.assistantName} aria-hidden={!open} id="ai-assistant-panel">
        <div className="ai-head">
          <div className="ai-head-id">
            <span className="ai-avatar" aria-hidden="true"><Sparkles size={18} /></span>
            <div>
              <strong>{strings.assistantName}</strong>
              <small>{strings.subtitle}</small>
            </div>
          </div>
          <button type="button" className="ai-close" onClick={closePanel} aria-label={strings.closeLabel}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="ai-lang" role="group" aria-label={strings.languageLabel}>
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`ai-lang-btn ${lang === l.code ? 'active' : ''}`}
              aria-pressed={lang === l.code}
              onClick={() => chooseLang(l.code)}
            >
              <span aria-hidden="true">{l.flag}</span> {l.label}
            </button>
          ))}
        </div>

        <div className="ai-log" ref={logRef} role="log" aria-live="polite" aria-label={strings.assistantName}>
          {messages.map((m, i) => (
            <div key={i} className={`ai-msg ai-msg-${m.role}`}>
              {m.role === 'assistant' && <span className="ai-msg-icon" aria-hidden="true"><Bot size={15} /></span>}
              <div className="ai-bubble"><RichText text={m.text} /></div>
            </div>
          ))}
          {busy && (
            <div className="ai-msg ai-msg-assistant">
              <span className="ai-msg-icon" aria-hidden="true"><Bot size={15} /></span>
              <div className="ai-bubble ai-typing" aria-label={strings.typingLabel}>
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          {showStarters && (
            <div className="ai-starters">
              <p className="ai-starters-title">{strings.startersTitle}</p>
              {STARTERS[lang].map((q) => (
                <button key={q} type="button" className="ai-starter" onClick={() => onStarter(q)}>{q}</button>
              ))}
            </div>
          )}
        </div>

        <p className="ai-disclaimer">{strings.disclaimer}</p>

        <form className="ai-input-row" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="ai-input">{strings.placeholder}</label>
          <textarea
            id="ai-input"
            ref={inputRef}
            className="ai-input"
            value={input}
            rows={1}
            placeholder={strings.placeholder}
            maxLength={MAX_LEN}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit(e)
              }
            }}
          />
          <button type="submit" className="ai-send" disabled={busy || !input.trim()} aria-label={strings.sendLabel}>
            <Send size={17} aria-hidden="true" />
          </button>
        </form>
      </div>
      )}

      <button
        type="button"
        ref={fabRef}
        className={`ai-fab ${open ? 'ai-fab-active' : ''}`}
        onClick={toggle}
        aria-expanded={open}
        aria-controls="ai-assistant-panel"
        aria-label={open ? strings.closeLabel : strings.openLabel}
      >
        {open ? <X size={22} aria-hidden="true" /> : <MessageCircle size={22} aria-hidden="true" />}
        {!open && <span className="ai-fab-tip">{strings.name}</span>}
      </button>
    </>
  )
}
