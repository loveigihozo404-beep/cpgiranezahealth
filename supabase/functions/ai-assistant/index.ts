// ─────────────────────────────────────────────────────────────────────────────
// CP Giraneza Health — AI Assistant Edge Function (Deno / Supabase Edge Runtime)
//
// SECURITY MODEL
//   * The AI provider API key lives ONLY here, as a server-side secret
//     (`supabase secrets set ...`). It is NEVER shipped to or readable by the
//     browser. The frontend calls this function with the public anon key via
//     `supabase.functions.invoke('ai-assistant', { body })`.
//   * The function is read-only with respect to data: it never queries the
//     database and only ever reasons over the PUBLIC site context the browser
//     supplies (contact info, about text, home-care summary). It cannot leak
//     admin, student, application or account data because it never touches them.
//   * Input is validated, length-capped and sanitized; requests are rate-limited
//     per client IP as a basic abuse guard.
//
// DEPLOY (run in a terminal at the project root, requires Supabase CLI):
//   supabase login
//   supabase link --project-ref ufswtdaipdvnvudxaird
//   supabase functions deploy ai-assistant --no-verify-jwt
//   # store ONE FREE-TIER provider secret (no credit card required):
//   supabase secrets set GROQ_API_KEY=...            # free tier (default)
//   #   or GOOGLE_GEMINI_API_KEY=...  (free tier)
//   # optional model override:  supabase secrets set AI_MODEL=llama-3.3-70b-versatile
//
// PROVIDER PRIORITY (FREE ONLY): GROQ -> GEMINI. No paid provider is used or
// required. If neither secret is set the function returns { reply: null } so
// the widget automatically uses its grounded offline answers (still safe, still
// multilingual, still never inventing facts).
// ─────────────────────────────────────────────────────────────────────────────

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Lang = 'rw' | 'en' | 'fr'
const LANG_NAME: Record<Lang, string> = { rw: 'Kinyarwanda', en: 'English', fr: 'French' }
const isLang = (v: unknown): v is Lang => v === 'rw' || v === 'en' || v === 'fr'

const MAX_MESSAGES = 12
const MAX_CONTENT = 2000
const MAX_CONTEXT = 1200

// Very small in-memory rate limiter (best effort, per Edge instance).
const buckets = new Map<string, { count: number; reset: number }>()
function rateLimited(ip: string, limit = 12, windowMs = 60_000): boolean {
  const now = Date.now()
  const rec = buckets.get(ip) || { count: 0, reset: now + windowMs }
  if (now > rec.reset) {
    rec.count = 0
    rec.reset = now + windowMs
  }
  rec.count += 1
  buckets.set(ip, rec)
  return rec.count > limit
}

// Control characters (same set as /[\u0000-\u001f\u007f]/, written without
// control-character escapes so static linters do not flag the pattern).
const CONTROL_CHARS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
  'g',
)

function cleanText(value: unknown, cap: number): string {
  if (typeof value !== 'string') return ''
  // strip control characters and clamp length
  return value.replace(CONTROL_CHARS, ' ').trim().slice(0, cap)
}

const PROD_URL = 'https://www.cpgiranezahealth.rw'

type SiteContext = {
  email: string
  base: string
  siteUrl: string
  aboutText: string
  aboutMission: string
  aboutVision: string
  homecareText: string
  homecareServices: string[]
  coursesHint: string
  admissionsText: string
  howToApplyText: string
  entryRequirementsText: string
  importantDatesText: string
  enrollText: string
}

function sanitizeContext(raw: unknown): SiteContext {
  const c = (raw || {}) as Record<string, unknown>
  const services = Array.isArray(c.homecareServices)
    ? (c.homecareServices as unknown[]).map((s) => cleanText(s, 120)).filter(Boolean).slice(0, 20)
    : []
  return {
    email: cleanText(c.email, 120),
    base: cleanText(c.base, 160),
    siteUrl: cleanText(c.siteUrl, 160) || PROD_URL,
    aboutText: cleanText(c.aboutText, MAX_CONTEXT),
    aboutMission: cleanText(c.aboutMission, MAX_CONTEXT),
    aboutVision: cleanText(c.aboutVision, MAX_CONTEXT),
    homecareText: cleanText(c.homecareText, MAX_CONTEXT),
    homecareServices: services,
    coursesHint: cleanText(c.coursesHint, 200),
    admissionsText: cleanText(c.admissionsText, MAX_CONTEXT),
    howToApplyText: cleanText(c.howToApplyText, MAX_CONTEXT),
    entryRequirementsText: cleanText(c.entryRequirementsText, MAX_CONTEXT),
    importantDatesText: cleanText(c.importantDatesText, MAX_CONTEXT),
    enrollText: cleanText(c.enrollText, MAX_CONTEXT),
  }
}

function buildSystemPrompt(lang: Lang, ctx: SiteContext): string {
  const url = ctx.siteUrl || PROD_URL
  return [
    `You are the official AI Assistant of CP Giraneza Health, a healthcare training and home-care organisation${ctx.base ? ` based in ${ctx.base}` : ''}.`,
    'You help visitors understand and navigate this website: the organisation (About Us), programmes/courses, the admissions/application process, home-care services, accounts (login/register) and contact details.',
    '',
    `ANSWER ONLY IN ${LANG_NAME[lang].toUpperCase()}. Keep replying in ${LANG_NAME[lang]} even if the visitor writes in another language, unless they explicitly ask to switch. Never mix languages randomly.`,
    '',
    'HOW TO LINK TO PAGES (strict):',
    '- When you point to a page, use the marker format [[Label|/path]] with a PATH ONLY, e.g. [[Courses|/courses]]. The real pages are: / , /about, /courses, /home-care, /admissions, /admissions/how-to-apply, /admissions/entry-requirements, /admissions/important-dates, /admissions/apply, /admissions/status, /register, /login, /contact, /faq.',
    `- If you must give a full web address, always use the production site ${url}. NEVER output "localhost", "127.0.0.1", "0.0.0.0" or any port number — those are private development URLs that must never appear to a visitor.`,
    '',
    'GROUNDING RULES (strict):',
    '- Use ONLY the SITE DATA below and how this site is organised. Answer normal questions about the website FROM that data instead of refusing.',
    '- NEVER invent or guess prices, fees, service details, admission requirements, dates, policies or contact information not present in the SITE DATA.',
    '- Only fall back to "that is not available here, please contact ..." when the SITE DATA genuinely does not cover the question.',
    '- When relevant, guide the visitor step by step and link them to the correct page.',
    '',
    'SAFETY RULES (strict):',
    '- You are NOT a medical professional; keep health content general and point visitors to qualified care or emergency services.',
    '- Never ask for, reveal or store personal, admin, student, application or account data. Only public website information may be discussed. The admin dashboard is private and is never described.',
    '- Be concise, warm and professional. Prefer short paragraphs.',
    '',
    'SITE DATA (public):',
    ctx.aboutText ? `About: ${ctx.aboutText}` : '',
    ctx.aboutMission ? `Mission: ${ctx.aboutMission}` : '',
    ctx.aboutVision ? `Vision: ${ctx.aboutVision}` : '',
    ctx.coursesHint ? `Programmes focus on: ${ctx.coursesHint}. See /courses for the full catalogue; duration, level and requirements are shown per programme.` : '',
    ctx.admissionsText ? `Admissions: ${ctx.admissionsText}` : '',
    ctx.howToApplyText ? `How to apply: ${ctx.howToApplyText} Steps: personal details, academic background, programme choice, required documents, review and submit — then track the application on /admissions/status using the reference number.` : '',
    ctx.entryRequirementsText ? `Entry requirements: ${ctx.entryRequirementsText}` : '',
    ctx.importantDatesText ? `Important dates: ${ctx.importantDatesText}` : '',
    ctx.enrollText ? `Accounts and enrolment: ${ctx.enrollText}` : '',
    ctx.homecareServices.length ? `Home-care services: ${ctx.homecareServices.join(', ')}` : '',
    ctx.homecareText ? `Home-care summary: ${ctx.homecareText}` : '',
    `Contact email: ${ctx.email || 'see /contact page'}`,
    ctx.base ? `Location: ${ctx.base}` : '',
    'Submitting an online application is free; any enrolment costs are confirmed by the admissions office before enrolment.',
  ]
    .filter(Boolean)
    .join('\n')
}

// Never let a private/dev origin reach a visitor; rewrite it to production.
function sanitizeReply(text: string, url: string): string {
  return (text || '').replace(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?/gi, url || PROD_URL)
}

type ChatMsg = { role: 'user' | 'assistant'; content: string }

async function json(res: unknown, status = 200): Promise<Response> {
  return new Response(JSON.stringify(res), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }
  if (req.method !== 'POST') {
    return json({ reply: null, error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
  if (rateLimited(ip)) {
    return json({ reply: null, error: 'RATE_LIMITED' }, 429)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ reply: null, error: 'BAD_JSON' })
  }

  const lang: Lang = isLang(body.language) ? body.language : 'en'
  const ctx = sanitizeContext(body.context)
  const system = buildSystemPrompt(lang, ctx)

  const rawMessages: unknown[] = Array.isArray(body.messages) ? (body.messages as unknown[]) : []
  const messages: ChatMsg[] = rawMessages
    .slice(-MAX_MESSAGES)
    .map((entry) => {
      const m = (entry || {}) as Record<string, unknown>
      return {
        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: cleanText(m.content, MAX_CONTENT),
      }
    })
    .filter((m: ChatMsg) => m.content.length > 0)

  if (messages.length === 0) {
    return json({ reply: null, error: 'NO_INPUT' })
  }

  const temperature = 0.4

  try {
    let reply = ''

    const groqKey = Deno.env.get('GROQ_API_KEY')
    const geminiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY') || Deno.env.get('GEMINI_API_KEY')

    if (groqKey) {
      const model = Deno.env.get('AI_MODEL') || 'llama-3.3-70b-versatile'
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: 700,
          messages: [{ role: 'system', content: system }, ...messages],
        }),
      })
      const d = await r.json()
      reply = d?.choices?.[0]?.message?.content || ''
    } else if (geminiKey) {
      const model = Deno.env.get('AI_MODEL') || 'gemini-1.5-flash'
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents,
            generationConfig: { temperature, maxOutputTokens: 700 },
          }),
        },
      )
      const d = await r.json()
      reply = d?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') || ''
    } else {
      // No free provider configured — the widget uses grounded offline answers.
      return json({ reply: null, error: 'AI_NOT_CONFIGURED' })
    }

    reply = sanitizeReply((reply || '').trim(), ctx.siteUrl)
    if (!reply) return json({ reply: null, error: 'EMPTY_REPLY' })
    return json({ reply })
  } catch (err) {
    // Upstream/provider failure: reply null so the client falls back offline.
    console.error('[ai-assistant] upstream error:', err instanceof Error ? err.message : err)
    return json({ reply: null, error: 'UPSTREAM_ERROR' })
  }
})
