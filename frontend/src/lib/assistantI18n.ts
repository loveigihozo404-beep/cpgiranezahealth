// ─────────────────────────────────────────────────────────────────────────────
// AI Assistant — language + UI strings (Kinyarwanda / English / French)
//
// This module is intentionally free of React and network calls so it can be
// reused by both the widget UI and the offline answer engine. Nothing here is
// a secret and none of it is used to talk to the AI provider directly — the
// provider key lives ONLY in the Supabase Edge Function (server-side).
// ─────────────────────────────────────────────────────────────────────────────

export type Lang = 'rw' | 'en' | 'fr'

// Canonical production origin. Assistant replies must NEVER expose a dev/localhost
// URL; anything pointing at a local server is rewritten to this (see sanitize).
export const PUBLIC_SITE_URL = 'https://www.cpgiranezahealth.rw'

export const LANGS: Array<{ code: Lang; label: string; flag: string }> = [
  { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
]

export const isLang = (value: unknown): value is Lang => value === 'rw' || value === 'en' || value === 'fr'

export type AssistantStrings = {
  name: string
  assistantName: string
  subtitle: string
  openLabel: string
  closeLabel: string
  languageLabel: string
  placeholder: string
  sendLabel: string
  typingLabel: string
  startersTitle: string
  greeting: string
  disclaimer: string
  unavailable: string
  navigation: string
  moreHelp: string
  error: string
}

// {email} is replaced at runtime with the live contact email from the CMS.
export const UI: Record<Lang, AssistantStrings> = {
  en: {
    name: 'Assistant',
    assistantName: 'CP Giraneza AI Assistant',
    subtitle: 'Ask about courses, admissions, home care, signing in and more.',
    openLabel: 'Open AI Assistant',
    closeLabel: 'Close AI Assistant',
    languageLabel: 'Language',
    placeholder: 'Type your question…',
    sendLabel: 'Send',
    typingLabel: 'Assistant is typing…',
    startersTitle: 'Try asking',
    greeting:
      'Muraho and hello! I am the CP Giraneza Health assistant. I can help you find programmes, understand admissions, explore home care and get around this website. How can I help you today?',
    disclaimer:
      'I share general information about this website and our services. I am not a medical professional — for any medical concern, please contact qualified care or emergency services.',
    unavailable:
      'I do not have that information right now. Please contact our team at {email} or use the [[Contact|/contact]] page and we will be glad to help.',
    navigation:
      'You can reach these pages from the top menu: [[Home|/]] \u00b7 [[Home Care|/home-care]] \u00b7 [[Courses|/courses]] \u00b7 [[Admissions|/admissions]] \u00b7 [[About Us|/about]] \u00b7 [[Contact|/contact]] \u00b7 [[Create account|/register]] \u00b7 [[Login|/login]] \u00b7 [[FAQ|/faq]].',
    moreHelp: 'If you need anything else, contact us at {email} or use the [[Contact|/contact]] page.',
    error: 'Sorry, something went wrong while answering. Please try again in a moment.',
  },
  fr: {
    name: 'Assistant',
    assistantName: 'Assistant IA CP Giraneza',
    subtitle: 'Posez vos questions sur les formations, les admissions, les soins à domicile, la connexion, etc.',
    openLabel: "Ouvrir l'assistant IA",
    closeLabel: "Fermer l'assistant IA",
    languageLabel: 'Langue',
    placeholder: 'Écrivez votre question…',
    sendLabel: 'Envoyer',
    typingLabel: "L'assistant est en train d'écrire…",
    startersTitle: 'Essayez de demander',
    greeting:
      "Bonjour ! Je suis l'assistant de CP Giraneza Health. Je peux vous aider à trouver les programmes, comprendre les admissions, découvrir les soins à domicile et naviguer sur ce site. Comment puis-je vous aider ?",
    disclaimer:
      "Je fournis des informations générales sur ce site et nos services. Je ne suis pas un professionnel de santé — pour tout problème médical, contactez un professionnel qualifié ou les services d'urgence.",
    unavailable:
      "Je n'ai pas cette information pour le moment. Contactez notre \u00e9quipe \u00e0 {email} ou consultez la page [[Contact|/contact]], nous serons heureux de vous aider.",
    navigation:
      'Vous pouvez accéder \u00e0 ces pages depuis le menu : [[Accueil|/]] \u00b7 [[Soins \u00e0 domicile|/home-care]] \u00b7 [[Formations|/courses]] \u00b7 [[Admissions|/admissions]] \u00b7 [[\u00c0 propos|/about]] \u00b7 [[Contact|/contact]] \u00b7 [[Cr\u00e9er un compte|/register]] \u00b7 [[Connexion|/login]] \u00b7 [[FAQ|/faq]].',
    moreHelp: 'Si vous avez besoin d\u2019autre chose, contactez-nous \u00e0 {email} ou via la page [[Contact|/contact]].',
    error: 'Une erreur est survenue pendant la r\u00e9ponse. Veuillez r\u00e9essayer dans un instant.',
  },
  rw: {
    name: 'Umufasha',
    assistantName: 'Umufasha wa AI wa CP Giraneza',
    subtitle: 'Bariza ku bijyanye n\'amahugurwa, kwiyandikisha, serivisi zo mu ngo, kwinjira muri konti n\'ibindi.',
    openLabel: 'Fungura umufasha wa AI',
    closeLabel: 'Funga umufasha wa AI',
    languageLabel: 'Ururimi',
    placeholder: 'Andika ikibazo cyawe…',
    sendLabel: 'Ohereza',
    typingLabel: 'Umufasha arimo kwandika…',
    startersTitle: 'Gerageza ubaze',
    greeting:
      'Muraho! Njyewe ndi umufasha wa CP Giraneza Health. Nshobora kugufasha kubona amahugurwa, gusobanukirwa ukwiyandikisha, kumenya serivisi zo mu ngo no kugenduka neza kuri uru rubuga. Ngufasha gute uyu munsi?',
    disclaimer:
      'Ntanga amakuru rusange y\'uru rubuga na serivisi zacu. Sind\'uhanga w\'ubuvuzi — ku bibazo by\'ubuzima, nyamuneka wandikire abahanga b\'ubuvuzi cyangwa inzego z\'ubutabazi.',
    unavailable:
      'Ntabwo mfite ayo makuru ubu. Nyamuneka wandikire ku {email} cyangwa ukoreshe urubuga rwa [[Contact|/contact]], tuzaguha igisubizo.',
    navigation:
      'Ushobora kugera kuri izi mpapuro ukoresheje menu yo hejuru: [[Ahabanza|/]] · [[Home Care|/home-care]] · [[Amahugurwa|/courses]] · [[Admissions|/admissions]] · [[Ibyerekeye twe|/about]] · [[Twandikire|/contact]] · [[Kora konti|/register]] · [[Injira|/login]] · [[IBIBAZO|/faq]].',
    moreHelp: 'Niba ukeneye ikindi kintu, twandikire kuri {email} cyangwa ukoreshe urubuga rwa [[Twandikire|/contact]].',
    error: 'Habaye ikibazo mu gutanga igisubizo. Nyamuneka ugerageze nyuma y\'akanya.',
  },
}

export const STARTERS: Record<Lang, string[]> = {
  en: [
    'How do I apply for a programme?',
    'What courses do you offer?',
    'Tell me about your home-care services',
    'How do I create an account?',
    'How can I contact CP Giraneza Health?',
  ],
  fr: [
    'Comment postuler à un programme ?',
    'Quels cours proposez-vous ?',
    'Présentez-moi vos soins à domicile',
    'Comment créer un compte ?',
    'Comment contacter CP Giraneza Health ?',
  ],
  rw: [
    'Niyandikisha gute mu mahugurwa?',
    'Amahugurwa mutanga ni ayahe?',
    'Mumbwire ku serivisi zanyu zo mu ngo',
    'Narema gute konti?',
    'Nabagera gute nanjye?',
  ],
}
