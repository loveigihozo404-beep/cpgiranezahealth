// ─────────────────────────────────────────────────────────────────────────────
// AI Assistant — grounded knowledge, offline answers and reply sanitising.
//
// This module is the single source of truth for the assistant's behaviour when
// it is NOT using a live AI provider (offline / no key configured / provider
// error) and for hardening the text of any reply before it is shown.
//
// Everything is assembled from PUBLIC website facts (the live CMS content that
// the widget passes in as `AssistantContext`) and the REAL routes of this app,
// so the assistant never invents prices, services, requirements or policies and
// always degrades to "here is how to get around / contact the team" instead of a
// cold "I don't know". The same public context is also fed to the Edge Function
// as the grounding source for the live AI (see supabase/functions/ai-assistant).
//
// Link markers: text wrapped as [[Label|/path]] is rendered by the widget as an
// in-app link (React Router <Link>) or, for absolute URLs, a normal anchor.
// ─────────────────────────────────────────────────────────────────────────────

import type { Lang } from './assistantI18n'
import { UI, PUBLIC_SITE_URL } from './assistantI18n'

export type AssistantContext = {
  email: string
  base: string
  // Optional live CMS content supplied by the widget. When present the English
  // answers interpolate it directly (single source of truth); the Kinyarwanda /
  // French answers stay in-language because the CMS copy is English-only.
  siteUrl?: string
  aboutTitle?: string
  aboutText?: string
  aboutMission?: string
  aboutVision?: string
  homecareTitle?: string
  homecareText?: string
  homecareServices?: string[]
  coursesHint?: string
  admissionsText?: string
  howToApplyText?: string
  entryRequirementsText?: string
  importantDatesText?: string
  enrollText?: string
}

// A compact map of the real public routes. Used for the navigation answer and
// shared with the AI prompt so it can point visitors at pages that exist.
export const ROUTES: Array<[string, string]> = [
  ['Home', '/'],
  ['About CP Giraneza Health', '/about'],
  ['Courses / programmes', '/courses'],
  ['Home Care services', '/home-care'],
  ['Admissions overview', '/admissions'],
  ['How to apply', '/admissions/how-to-apply'],
  ['Entry requirements', '/admissions/entry-requirements'],
  ['Important dates', '/admissions/important-dates'],
  ['Online application form', '/admissions/apply'],
  ['Application status tracking', '/admissions/status'],
  ['Create an account (register)', '/register'],
  ['Log in', '/login'],
  ['Contact', '/contact'],
  ['FAQ', '/faq'],
  ['Careers', '/careers'],
  ['News', '/news'],
  ['Partnership', '/partnership'],
  ['Verify a certificate', '/verify-certificate'],
]

// Lower-case, de-accent, drop punctuation (keep letters/digits/space/slash).
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Lightweight language guess, used only when the visitor has not manually
// chosen a language. Once a language is picked manually it is always respected.
export function detectLang(text: string): Lang | null {
  const n = ' ' + normalize(text) + ' '
  const rw = ['muraho', 'mwiriwe', 'ndashaka', 'nshaka', 'ngufasha', 'nyabuneka', 'nyamuneka', 'murakoze', 'ninde', 'amakuru', 'nababona', 'nabagera', 'niyihe', 'ayahe', 'ijambo', 'kwiyandikisha', 'serivisi', 'urupapuro', 'inkiko']
  const fr = ['bonjour', 'salut', 'comment', 'quels', 'quel', 'quelle', 'programme', 'postuler', 'admission', 'candidature', 'domicile', 'soins', 'contact', 'compte', 'connexion', 'merci', 'suis', 'avoir', 'trouver', 'inscrire']
  const en = ['hello', 'hi', 'how', 'what', 'where', 'apply', 'course', 'program', 'help', 'home care', 'account', 'contact', 'thank', 'price', 'fee', 'offer', 'find']
  // Score each language by distinct keyword hits; ties resolve rw > fr > en.
  const score = (list: string[]) => list.reduce((acc, w) => acc + (n.includes(` ${w} `) || n.includes(w) ? 1 : 0), 0)
  const sRw = score(rw)
  const sFr = score(fr)
  const sEn = score(en)
  const best = Math.max(sRw, sFr, sEn)
  if (best === 0) return null
  if (sRw === best) return 'rw'
  if (sFr === best) return 'fr'
  return 'en'
}

type Intent =
  | 'about'
  | 'courses'
  | 'admissions'
  | 'requirements'
  | 'dates'
  | 'status'
  | 'fees'
  | 'homecare'
  | 'account'
  | 'contact'
  | 'thanks'
  | 'greeting'

// Per-intent keywords across all three languages. Matching is substring based on
// a spaced, normalized string. Multi-word phrases are weighted higher than
// single tokens so a specific noun (e.g. "home care", "cp giraneza") beats a
// generic word (e.g. "what", "how"). Only language-neutral, specific signals are
// listed here — generic words like "what is" / "ni iki" are NOT about-keywords on
// their own, so "Home Care ni iki?" resolves to home care, not about.
const INTENT_KEYWORDS: Record<Intent, string[]> = {
  greeting: ['hello', 'good morning', 'good evening', 'bonsoir', 'muraho', 'mwiriwe', 'bonjour', 'salut', 'coucou'],
  thanks: ['thank', 'thanks', 'murakoze', 'merci', 'ndakoze'],
  admissions: ['apply', 'application', 'admission', 'enroll', 'enrol', 'entrance', 'how to apply', 'postuler', 'candidature', 'candidat', 'inscrire', 'inscription', 's inscrire', 's inscrire', 'candidater', 'kwiyandikisha', 'kuremera', 'gusaba ikibanza', 'porogaramu', 'nusaba', 'iyandikishe', 'kwandikisha'],
  status: ['status', 'track', 'tracking', 'reference', 'progress', 'result', 'suivre', 'suivi', 'statut', 'avancement', 'imerere', 'nomero', 'irambura', 'reba aho', 'aho ageze'],
  courses: ['course', 'courses', 'program', 'programme', 'programmes', 'training', 'first aid', 'class', 'curricul', 'study', 'cours', 'formation', 'formations', 'amahugurwa', 'isomo', 'amasomo', 'masomo', 'somo', 'imyigire', 'porogaramu'],
  homecare: ['home care', 'home-care', 'homecare', 'home health', 'elderly', 'nursing at home', 'caregiver', 'at home', 'domicile', 'soins', 'a domicile', 'ingo', 'kurwaza', 'mu ngo', 'ubuke'],
  account: ['account', 'login', 'log in', 'sign in', 'signin', 'register', 'create account', 'sign up', 'signup', 'password', 'profile', 'compte', 'connexion', 'connecter', 'mot de passe', 'konti', 'kwinjira', 'injira', 'kora konti', 'ijambo ry ibanga', 'ufungura'],
  contact: ['contact', 'email', 'e-mail', 'phone', 'telephone', 'address', 'reach', 'where are you', 'location', 'get in touch', 'reach you', 'joindre', 'numero', 'ho muri', 'aho muri', 'nababona', 'kubabona', 'twandikire', 'tubandikire', 'aho mumuri', 'tulire'],
  about: ['about', 'who are you', 'your mission', 'your vision', 'history', 'story', 'what does', 'company', 'organisation', 'organization', 'cp giraneza', 'giraneza', 'what is cp', 'qu est ce que cp', 'a propos', 'propos', 'votre organisation', 'ni nde', 'ni iki cp', 'amakuru yanyu', 'ibyo mukora', 'umushinga', 'integambanyirwe', ' integambanyirwe'],
  fees: ['fees', 'price', 'cost', 'how much', 'pay', 'payment', 'tuition', 'expensive', 'frais', 'prix', 'cout', 'tarif', 'amafaranga', 'igiciro', 'ibiciro', 'kwishyura', 'nishyura angahe', 'angahe'],
  requirements: ['requirement', 'requirements', 'eligib', 'what do i need', 'documents needed', 'condition', 'entry requirement', 'qualification needed', 'exigence', 'bisabwa', 'inyandiko', 'ibyandikisho', 'ibisabwa', 'nsabwa'],
  dates: ['date', 'dates', 'deadline', 'intake', 'when', 'when do', 'cycle', 'opening', 'start date', 'term', 'date limite', 'important date', 'banda', 'igihe', 'ryo gutangira', 'ejo', 'ntangirira', 'umwaka'],
}

// Page-name hints used only as a soft, last-resort navigation trigger so that
// "where can I find careers / the newsletter / etc" still gets a helpful answer
// instead of the hard "I don't know" fallback.
const PAGE_HINTS = ['career', 'careers', 'job', 'jobs', 'news', 'newsletter', 'article', 'partner', 'partnership', 'gallery', 'faq', 'certificate', 'verify', 'enroll', 'vision', 'values', 'dashboard', 'home page', 'homepage']

const ALL_INTENTS = Object.keys(INTENT_KEYWORDS) as Intent[]

// Score every intent by the strength of its matched keywords; the highest wins.
// Multi-word phrases (weight 3) beat single tokens (weight 2), which keeps
// specific-topic questions from being hijacked by generic words.
function matchIntent(text: string): Intent | null {
  const n = ' ' + normalize(text) + ' '
  let best: Intent | null = null
  let bestScore = 0
  for (const intent of ALL_INTENTS) {
    let score = 0
    for (const kw of INTENT_KEYWORDS[intent]) {
      const key = kw.trim().toLowerCase()
      if (!key) continue
      // Substring match so plurals (admission→admissions) and agglutinative
      // Kinyarwanda / conjugated French (na-kwiyandikisha, contacter) resolve.
      // Generic short tokens that could match inside common words are kept out
      // of the lists; multi-word phrases are weighted higher to win ties.
      if (n.includes(key)) {
        score += key.includes(' ') ? 3 : 2
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = intent
    }
  }
  return bestScore >= 2 ? best : null
}

function hasPageHint(text: string): boolean {
  const n = ' ' + normalize(text) + ' '
  return PAGE_HINTS.some((w) => n.includes(w))
}

function servicesLine(ctx: AssistantContext): string {
  const list = (ctx.homecareServices || []).filter(Boolean)
  return list.length ? list.join(', ') : 'elderly support, home assistance, post-care support and basic home health support'
}

function basePhrase(lang: Lang, base: string): string {
  if (!base) return ''
  if (lang === 'fr') return ` (bas\u00e9e \u00e0 ${base})`
  if (lang === 'rw') return ` (duherereye i ${base})`
  return ` (based in ${base})`
}

function withEmail(text: string, email: string): string {
  return text.replace(/\{email\}/g, email)
}

// Collapse leftover template gaps and tidy spacing without touching markers.
function tidy(text: string): string {
  return text
    .replace(/\[\[\s*/g, '[[')
    .replace(/\s*\]\]/g, ']]')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
}

/**
 * Produce a grounded answer in the given language WITHOUT calling any AI
 * provider. Order of preference:
 *   1. a matched topic intent (about/courses/admissions/home care/etc.),
 *   2. a soft navigation answer when the message names a site page,
 *   3. the honest "not available → contact us" fallback (only for genuinely
 *      unknown questions).
 * English answers interpolate the live CMS text from `ctx`; Kinyarwanda and
 * French answers stay in-language (the CMS is English) and still embed the
 * language-neutral live data (email, services, location).
 */
export function getOfflineAnswer(text: string, lang: Lang, ctx: AssistantContext): string {
  const intent = matchIntent(text)

  if (!intent) {
    // Genuinely unknown topic, but the visitor mentioned a real page → help them
    // navigate rather than dead-ending with "I don't know".
    if (hasPageHint(text)) return tidy(withEmail(`${UI[lang].navigation} ${UI[lang].moreHelp}`, ctx.email))
    return tidy(withEmail(UI[lang].unavailable, ctx.email))
  }

  const A: Record<Intent, Record<Lang, string>> = {
    greeting: {
      en: 'Muraho and hello! I can help you with courses, admissions, home care, creating an account and finding pages. What are you looking for?',
      fr: 'Bonjour ! Je peux vous aider avec les cours, les admissions, les soins à domicile, la création de compte et la navigation. Que cherchez-vous ?',
      rw: 'Muraho! Nshobora kugufasha ku bijyanye n\'amahugurwa, kwiyandikisha, serivisi zo mu ngo, gukora konti no kubona impapuro. Ushaka kumenya iki?',
    },
    thanks: {
      en: 'You\'re welcome! Is there anything else I can help you find?',
      fr: 'Avec plaisir ! Y a-t-il autre chose que je puisse vous aider à trouver ?',
      rw: 'Byiza kumva! Hari ikindi wari kumfashaho?',
    },
    about: {
      en: '{AX} {AM} Read more on the [[About Us|/about]] page.',
      fr: 'CP Giraneza Health est une plateforme de formation aux soins de santé et de soins à domicile, axée sur des compétences pratiques, le développement professionnel et un accompagnement digne à la maison. En savoir plus sur la page [[À propos|/about]].',
      rw: 'CP Giraneza Health ni urubuga rw\'amahugurwa mu by\'ubuvuzi no gutanga serivisi zo mu ngo, cyibanda ku bumenyi bufatika, iterambere ry\'umwuga no guha abantu ubufasha bw\'itekeza mu ngo. Soma byinshi ku rupapuro [[Ibyerekeye twe|/about]].',
    },
    courses: {
      en: 'We run practical, healthcare-focused programmes ({CH}). Browse the full catalogue on the [[Courses|/courses]] page and open a programme to see its duration, level and requirements. Ready to join? See [[Admissions|/admissions]].',
      fr: 'Nous proposons des formations pratiques orientées vers les soins de santé ({CH}). Consultez tout le catalogue sur la page [[Formations|/courses]] et ouvrez un programme pour voir sa durée, son niveau et ses conditions. Prêt à vous joindre ? Voir les [[Admissions|/admissions]].',
      rw: 'Dutanga amahugurwa y\'iby\'ubuzima ashingiye ku bikorwa ({CH}). Reba urutonde rwose ku rupapuro [[Amahugurwa|/courses]] hanyuma ufungure isomo urebe igihe rimara, urwego n\'ibisabwa. Witeguye? Reba [[Admissions|/admissions]].',
    },
    admissions: {
      en: '{HT} Open the [[How to apply|/admissions/how-to-apply]] guide, follow the steps (personal details, academic background, programme choice, documents, review) and submit online \u2014 you receive a reference number right away. Submitting an application is free. Start here: [[Admissions|/admissions]] or the [[online application|/admissions/apply]].',
      fr: 'Pour postuler, ouvrez le guide pas à pas [[Comment postuler|/admissions/how-to-apply]], suivez les étapes (informations personnelles, parcours académique, choix du programme, documents, vérification) puis soumettez en ligne — vous recevez immédiatement un numéro de référence. Le dépôt du dossier est gratuit. Commencez ici : [[Admissions|/admissions]] ou le [[formulaire en ligne|/admissions/apply]].',
      rw: 'Kugira ngo usabe, fungura intambwe ku yindi [[Uko wasaba|/admissions/how-to-apply]], ukurikire intambwe (amakuru yawe, amasomo, guhitamo porogaramu, inyandiko, kugenzura) hanyuma wohereze kuri interineti — uhita ubona nomero y\'irambura. Kohereza ikirego ni ubuntu. Tangira hano: [[Admissions|/admissions]] cyangwa [[ifishi ryo kuri interineti|/admissions/apply]].',
    },
    requirements: {
      en: '{ER} The general requirement for our certificate programmes is an A2 (secondary school) certificate or an accredited higher qualification; postgraduate pathways need a relevant first degree. See [[Entry requirements|/admissions/entry-requirements]].',
      fr: 'La condition générale pour nos certificats est un diplôme A2 (secondaire) ou une qualification supérieure accréditée ; les parcours de 3e cycle exigent un premier diplôme pertinent. Le bureau des admissions confirme votre éligibilité à l\'examen. Voir [[Conditions d\'admission|/admissions/entry-requirements]].',
      rw: 'Igisabwa rusange ku mahugurwa y\'ibyangombwa ni icyemezo cya A2 (ay\'isekondari) cyangwa impamyabumenyi yemerewe; ku rwego rwa kabiri hasabwa impamyabumenyi ibifasha. Ibiro byo kwakira biremeza ubushobozi bwawe. Reba [[Entry requirements|/admissions/entry-requirements]].',
    },
    dates: {
      en: '{ID} See [[Important dates|/admissions/important-dates]] for how the cycle works.',
      fr: 'Nous fonctionnons au fil de l\'eau : les candidatures sont reçues toute l\'année et examinées par ordre. Les décisions et dates de début sont confirmées par email. Voir [[Dates importantes|/admissions/important-dates]].',
      rw: 'Dwakira abanyeshuri umwaka wose, ibirego birebwa ku murongo. Ibyemezo n\'amatariki yo gutangira bitangazwa kuri email. Reba [[Important dates|/admissions/important-dates]].',
    },
    status: {
      en: 'You can follow your application at any time on the [[Application Status|/admissions/status]] page — enter the reference number and the email you used to apply to see its progress.',
      fr: 'Vous pouvez suivre votre candidature à tout moment sur la page [[Statut de la candidature|/admissions/status]] — saisissez le numéro de référence et l\'email utilisés pour voir l\'avancement.',
      rw: 'Ushobora gukurikirana ikirego cyawe igihe cyose ku rupapuro [[Application Status|/admissions/status]] — andika nomero y\'irambura na email wakoresheje kugira ngo urebe aho rigeze.',
    },
    fees: {
      en: 'There is no fee to submit an online application. Any enrolment-related costs are confirmed in writing by the admissions office before you enrol. I don\'t publish fixed prices here, so please check the [[programme page|/courses]] you\'re interested in or [[contact our team|/contact]] for current details.',
      fr: 'Le dépôt d\'une candidature en ligne est gratuit. Les éventuels frais d\'inscription sont confirmés par écrit par le bureau des admissions avant votre inscription. Nous n\'affichons pas de prix fixes ici : consultez la [[page du programme|/courses]] qui vous intéresse ou [[contactez notre équipe|/contact]] pour les détails à jour.',
      rw: 'Nta gihembo gisabwa kohereza ikirego kuri interineti. Ibindi bihembo by\'iyandikisha biremezwa mu nyandiko n\'ibiro byo kwakira mbere y\'iyandikisha. Ntitanga ibiciro bihamye hano: reba [[rupapuro ry\'isomo|/courses]] ry\'uwifuza cyangwa [[twandikire|/contact]] kugira ngo tumenye bigezweho.',
    },
    homecare: {
      en: 'Our home-care services include {S}. {T} Learn more or request support on the [[Home Care|/home-care]] page.',
      fr: 'Nos soins à domicile comprennent {S}. En savoir plus ou demander un accompagnement sur la page [[Soins à domicile|/home-care]].',
      rw: 'Serivisi zacu zo mu ngo zirimo {S}. Menya byinshi cyangwa usabe ubufasha ku rupapuro [[Home Care|/home-care]].',
    },
    account: {
      en: 'Create a free account on the [[Create account|/register]] page, then sign in any time from [[Login|/login]]. An account lets you enroll in programmes, track applications and keep your details in one secure place.',
      fr: 'Créez un compte gratuit sur la page [[Créer un compte|/register]], puis connectez-vous depuis [[Connexion|/login]]. Un compte vous permet de vous inscrire, de suivre vos candidatures et de garder vos informations au même endroit.',
      rw: 'Kora konti y\'ubuntu ku rupapuro [[Kora konti|/register]], hanyuma winjire kuri [[Injira|/login]]. Konti igufasha kwiyandikisha, gukurikirana ibirego no kubika amakuru yawe ahantu ho umutekano.',
    },
    contact: {
      en: 'You can reach us at {E}{B}. Use the [[Contact|/contact]] page to send a message and our team will respond.',
      fr: 'Vous pouvez nous joindre à {E}{B}. Utilisez la page [[Contact|/contact]] pour envoyer un message et notre équipe vous répondra.',
      rw: 'Ushobora kutwandikira kuri {E}{B}. Koresha urupapuro [[Twandikire|/contact]] wohereze ubutumwa kandi itsinda ryacu rizaguha igisubizo.',
    },
  }

  const fill = (template: string): string =>
    template
      .split('{S}').join(servicesLine(ctx))
      .split('{T}').join(lang === 'en' ? (ctx.homecareText || '') : '')
      .split('{E}').join(ctx.email)
      .split('{B}').join(basePhrase(lang, ctx.base))
      .split('{AX}').join(lang === 'en' ? (ctx.aboutText || '') : '')
      .split('{AM}').join(lang === 'en' ? (ctx.aboutMission || '') : '')
      .split('{CH}').join(ctx.coursesHint?.trim() || 'first aid, emergency care and home-care support')
      .split('{HT}').join(lang === 'en' ? (ctx.howToApplyText || '') : '')
      .split('{ER}').join(lang === 'en' ? (ctx.entryRequirementsText || '') : '')
      .split('{ID}').join(lang === 'en' ? (ctx.importantDatesText || '') : '')
      .trim()

  return tidy(withEmail(fill(A[intent][lang]), ctx.email))
}

// Match a dev / localhost origin (any scheme, optional port, optional path).
const DEV_ORIGIN = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?/gi
// Match our own (production) origin inside an absolute URL, so it can be turned
// back into an internal route that React Router can resolve.
const SELF_ORIGIN = /https?:\/\/(?:www\.)?cpgiranezahealth\.rw/gi
// Markdown link -> our link marker, so model output renders as a working link.
const MD_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g

/**
 * Harden any assistant reply (AI or offline) before it is displayed:
 *   * never leak a localhost/dev URL — rewrite it to the production origin,
 *   * turn absolute URLs on our own site back into internal routes,
 *   * normalise markdown links into [[Label|path]] markers.
 */
export function sanitizeAssistantText(input: string, siteUrl: string = PUBLIC_SITE_URL): string {
  let text = input || ''
  text = text.replace(MD_LINK, '[[$1|$2]]')
  text = text.replace(DEV_ORIGIN, siteUrl)
  // http(s)://(www.)cpgiranezahealth.rw/<path> → /<path> (keep it in-app)
  text = text.replace(SELF_ORIGIN, '')
  return text
}

/** Public route map as plain text — usable in prompts / debugging. */
export function describeRoutesForPrompt(siteUrl: string = PUBLIC_SITE_URL): string {
  return ROUTES.map(([label, path]) => `- ${label}: ${siteUrl}${path}`).join('\n')
}
