/**
 * Google AI Translation Service
 * 
 * Provides Google AI-powered real-time translation for dynamic content
 * (job descriptions, feed posts, candidate bios, etc.) and language switching.
 * Uses Google Generative AI (Gemini) when configured, and falls back to
 * Google Neural Machine Translation API for instant, pure, unmixed translations.
 */

import type { SupportedLanguage } from '../utils/i18n'

const CACHE_KEY_PREFIX = 'namma_google_ai_trans_v2_'

// In-memory cache for ultra-fast instantaneous lookups
const memoryCache = new Map<string, string>()

/**
 * Pure language description for Google AI prompt to ensure zero language mixing
 */
const LANGUAGE_PURITY_PROMPTS: Record<SupportedLanguage, string> = {
  ta: 'pure Tamil (தமிழ்) using native Tamil vocabulary and script. Absolutely do NOT mix English words, Latin script, or transliterated Tanglish. Output ONLY the pure Tamil translation.',
  hi: 'pure Hindi (हिन्दी) using native Devanagari script. Absolutely do NOT mix English words, Latin script, or Hinglish. Output ONLY the pure Hindi translation.',
  en: 'natural, professional English. Output ONLY the English translation.',
}

/**
 * Curated high-frequency Tamil Nadu, Bangalore & Indian locations dictionary for 0ms instantaneous translation
 */
export const LOCATION_DICTIONARY: Record<string, { ta: string; hi: string }> = {
  'chennai global infocity': {
    ta: 'சென்னை குளோபல் இன்போசிட்டி',
    hi: 'चेन्नई ग्लोबल इंफोसिटी',
  },
  'chennai estancia it park': {
    ta: 'சென்னை எஸ்டான்சியா ஐடி பூங்கா',
    hi: 'चेन्नई एस्टैंसिया आईटी पार्क',
  },
  'chennai estancia it p...': {
    ta: 'சென்னை எஸ்டான்சியா ஐடி பூங்கா',
    hi: 'चेन्नई एस्टैंसिया आईटी पार्क',
  },
  'chennai estancia it': {
    ta: 'சென்னை எஸ்டான்சியா ஐடி பூங்கா',
    hi: 'चेन्नई एस्टैंसिया आईटी पार्क',
  },
  'chennai': {
    ta: 'சென்னை',
    hi: 'चेन्नई',
  },
  'coimbatore': {
    ta: 'கோயம்புத்தூர்',
    hi: 'कोयंबटूर',
  },
  'bangalore': {
    ta: 'பெங்களூரு',
    hi: 'बैंगलोर',
  },
  'bengaluru': {
    ta: 'பெங்களூரு',
    hi: 'बेंगलुरु',
  },
  'madurai': {
    ta: 'மதுரை',
    hi: 'मदुरै',
  },
  'trichy': {
    ta: 'திருச்சிராப்பள்ளி',
    hi: 'तिरुचिरापल्ली',
  },
  'tiruchirappalli': {
    ta: 'திருச்சிராப்பள்ளி',
    hi: 'तिरुचिरापल्ली',
  },
  'salem': {
    ta: 'சேலம்',
    hi: 'सेलम',
  },
  'tiruppur': {
    ta: 'திருப்பூர்',
    hi: 'तिरुपुर',
  },
  'erode': {
    ta: 'ஈரோடு',
    hi: 'इरोड',
  },
  'namakkal': {
    ta: 'நாமக்கல்',
    hi: 'नमक्कल',
  },
  'karur': {
    ta: 'கரூர்',
    hi: 'करूर',
  },
  'vellore': {
    ta: 'வேலூர்',
    hi: 'वेल्लोर',
  },
  'tirunelveli': {
    ta: 'திருநெல்வேலி',
    hi: 'तिरुनेलवेली',
  },
  'thoothukudi': {
    ta: 'தூத்துக்குடி',
    hi: 'थूथुकुडी',
  },
  'tuticorin': {
    ta: 'தூத்துக்குடி',
    hi: 'थूथुकुडी',
  },
  'hosur': {
    ta: 'ஓசூர்',
    hi: 'होसुर',
  },
  'thanjavur': {
    ta: 'தஞ்சாவூர்',
    hi: 'तंजावुर',
  },
  'dindigul': {
    ta: 'திண்டுக்கல்',
    hi: 'डिंडीगुल',
  },
  'kanchipuram': {
    ta: 'காஞ்சிபுரம்',
    hi: 'कांचीपुरम',
  },
  'chengalpattu': {
    ta: 'செங்கல்பட்டு',
    hi: 'चेंगलपट्टू',
  },
  'sivakasi': {
    ta: 'சிவகாசி',
    hi: 'शिवकाशी',
  },
  'virudhunagar': {
    ta: 'விருதுநகர்',
    hi: 'विरुधुनगर',
  },
  'ooty': {
    ta: 'ஊட்டி',
    hi: 'ऊटी',
  },
  'nilgiris': {
    ta: 'நீலகிரி',
    hi: 'नीलगिरि',
  },
  'kanyakumari': {
    ta: 'கன்னியாகுமரி',
    hi: 'कन्याकुमारी',
  },
  'nagercoil': {
    ta: 'நாகர்கோவில்',
    hi: 'नागरकोइल',
  },
  'pollachi': {
    ta: 'பொள்ளாச்சி',
    hi: 'पोल्लाची',
  },
  'krishnagiri': {
    ta: 'கிருஷ்ணகிரி',
    hi: 'कृष्णगिरि',
  },
  'dharmapuri': {
    ta: 'தருமபுரி',
    hi: 'धर्मपुरी',
  },
  'cuddalore': {
    ta: 'கடலூர்',
    hi: 'कुड्डालोर',
  },
  'villupuram': {
    ta: 'விழுப்புரம்',
    hi: 'विलुप्पुरम',
  },
  'pudukkottai': {
    ta: 'புதுக்கோட்டை',
    hi: 'पुदुक्कोट्टई',
  },
  'ramanathapuram': {
    ta: 'ராமநாதபுரம்',
    hi: 'रामनाथपुरम',
  },
  'sivaganga': {
    ta: 'சிவகங்கை',
    hi: 'शिवगंगा',
  },
  'theni': {
    ta: 'தேனி',
    hi: 'थेनी',
  },
  'tenkasi': {
    ta: 'தென்காசி',
    hi: 'तेनकासी',
  },
  'perambalur': {
    ta: 'பெரம்பலூர்',
    hi: 'पेराम्बलूर',
  },
  'ariyalur': {
    ta: 'அரியலூர்',
    hi: 'अरियालूर',
  },
  'tiruvallur': {
    ta: 'திருவள்ளூர்',
    hi: 'तिरुवल्लूर',
  },
  'ranipet': {
    ta: 'ராணிப்பேட்டை',
    hi: 'रानीपेट',
  },
  'tirupathur': {
    ta: 'திருப்பத்தூர்',
    hi: 'तिरुपात्तूर',
  },
  'tiruvannamalai': {
    ta: 'திருவண்ணாமலை',
    hi: 'तिरुवन्नामलाई',
  },
  'kallakurichi': {
    ta: 'கள்ளக்குறிச்சி',
    hi: 'कल्लाकुरिची',
  },
  'nagapattinam': {
    ta: 'நாகப்பட்டினம்',
    hi: 'नागापट्टिनम',
  },
  'mayiladuthurai': {
    ta: 'மயிலாடுதுறை',
    hi: 'मयिलादुथुराई',
  },
  'tiruvarur': {
    ta: 'திருவாரூர்',
    hi: 'तिरुवारूर',
  },
  'remote': {
    ta: 'வீட்டிலிருந்தே பணி',
    hi: 'रिमोट वर्क',
  },
  'tamil nadu': {
    ta: 'தமிழ்நாடு',
    hi: 'तमिलनाडु',
  },
  'india': {
    ta: 'இந்தியா',
    hi: 'भारत',
  },
  'hyderabad': {
    ta: 'ஹைதராபாத்',
    hi: 'हैदराबाद',
  },
  'pune': {
    ta: 'புனே',
    hi: 'पुणे',
  },
  'mumbai': {
    ta: 'மும்பை',
    hi: 'मुंबई',
  },
  'delhi': {
    ta: 'டெல்லி',
    hi: 'दिल्ली',
  },
  'ncr': {
    ta: 'டெல்லி என்.சி.ஆர்',
    hi: 'दिल्ली एनसीआर',
  },
  'gurgaon': {
    ta: 'குர்கான்',
    hi: 'गुरुग्राम',
  },
  'gurugram': {
    ta: 'குருகிராம்',
    hi: 'गुरुग्राम',
  },
  'noida': {
    ta: 'நொய்டா',
    hi: 'नोएडा',
  },
  'kochi': {
    ta: 'கொச்சி',
    hi: 'कोच्चि',
  },
  'trivandrum': {
    ta: 'திருவனந்தபுரம்',
    hi: 'तिरुवनंतपुरम',
  },
  'thiruvananthapuram': {
    ta: 'திருவனந்தபுரம்',
    hi: 'तिरुवनंतपुरम',
  },
}

// Pre-sorted by key length descending for longest-match greedy substitution
const SORTED_LOCATION_ENTRIES = Object.entries(LOCATION_DICTIONARY).sort(
  (a, b) => b[0].length - a[0].length
)

// Pre-computed reverse map for Tamil and Hindi locations back to English
const REVERSE_LOCATION_MAP: Record<string, string> = {}
for (const [enKey, trans] of Object.entries(LOCATION_DICTIONARY)) {
  if (trans.ta) REVERSE_LOCATION_MAP[trans.ta.toLowerCase().trim()] = enKey
  if (trans.hi) REVERSE_LOCATION_MAP[trans.hi.toLowerCase().trim()] = enKey
}

/**
 * Curated high-frequency Job Titles dictionary for 0ms instantaneous translation
 */
export const JOB_TITLE_DICTIONARY: Record<string, { ta: string; hi: string }> = {
  'staff full stack engineer (node.js & mobile)': {
    ta: 'பணியாளர்கள் முழு அடுக்கு பொறியாளர் (Node.js & மொபைல்)',
    hi: 'स्टाफ फुल स्टैक इंजीनियर (Node.js और मोबाइल)',
  },
  'staff full stack engineer': {
    ta: 'பணியாளர்கள் முழு அடுக்கு பொறியாளர்',
    hi: 'स्टाफ फुल स्टैक इंजीनियर',
  },
  'principal react & cloud native architect': {
    ta: 'முதன்மை ரியாக்ட் & கிளவுட் நேட்டிவ் ஆர்க்கிடெக்ட்',
    hi: 'प्रधान रिएक्ट और क्लाउड नेटिव आर्किटेक्ट',
  },
  'principal react & cloud native...': {
    ta: 'முதன்மை ரியாக்ட் & கிளவுட் நேட்டிவ் ஆர்க்கிடெக்ட்',
    hi: 'प्रधान रिएक्ट और क्लाउड नेटिव...',
  },
  'product designer': {
    ta: 'தயாரிப்பு வடிவமைப்பாளர்',
    hi: 'प्रोडक्ट डिज़ाइनर',
  },
  'senior react native engineer': {
    ta: 'மூத்த ரியாக்ட் நேட்டிவ் பொறியாளர்',
    hi: 'वरिष्ठ रिएक्ट नेटिव इंजीनियर',
  },
  'senior frontend engineer': {
    ta: 'மூத்த முன் அடுக்கு பொறியாளர்',
    hi: 'वरिष्ठ फ्रंटएंड इंजीनियर',
  },
  'full stack developer': {
    ta: 'முழு அடுக்கு டெவலப்பர்',
    hi: 'फुल स्टैक डेवलपर',
  },
  'full stack engineer': {
    ta: 'முழு அடுக்கு பொறியாளர்',
    hi: 'फुल स्टैक इंजीनियर',
  },
  'software engineer': {
    ta: 'மென்பொருள் பொறியாளர்',
    hi: 'सॉफ्टवेयर इंजीनियर',
  },
  'senior software engineer': {
    ta: 'மூத்த மென்பொருள் பொறியாளர்',
    hi: 'वरिष्ठ सॉफ्टवेयर इंजीनियर',
  },
  'backend developer': {
    ta: 'பின் அடுக்கு டெவலப்பர்',
    hi: 'बैकएंड डेवलपर',
  },
  'backend engineer': {
    ta: 'பின் அடுக்கு பொறியாளர்',
    hi: 'बैकएंड इंजीनियर',
  },
  'frontend developer': {
    ta: 'முன் அடுக்கு டெவலப்பர்',
    hi: 'फ्रंटएंड डेवलपर',
  },
  'devops engineer': {
    ta: 'டெவொப்ஸ் பொறியாளர்',
    hi: 'डेवऑप्स इंजीनियर',
  },
  'cloud architect': {
    ta: 'கிளவுட் ஆர்க்கிடெக்ட்',
    hi: 'क्लाउड आर्किटेक्ट',
  },
  'data scientist': {
    ta: 'தரவு விஞ்ஞானி',
    hi: 'डेटा वैज्ञानिक',
  },
  'data analyst': {
    ta: 'தரவு பகுப்பாய்வாளர்',
    hi: 'डेटा विश्लेषक',
  },
  'qa engineer': {
    ta: 'தரக்கட்டுப்பாடு பொறியாளர்',
    hi: 'गुणवत्ता आश्वासन इंजीनियर',
  },
  'quality assurance engineer': {
    ta: 'தரக்கட்டுப்பாடு பொறியாளர்',
    hi: 'गुणवत्ता आश्वासन इंजीनियर',
  },
  'hr recruiter': {
    ta: 'மனிதவள ஆட்சேர்ப்பாளர்',
    hi: 'एचआर भर्तीकर्ता',
  },
  'hr manager': {
    ta: 'மனிதவள மேலாளர்',
    hi: 'एचआर प्रबंधक',
  },
  'operations manager': {
    ta: 'செயல்பாட்டு மேலாளர்',
    hi: 'संचालन प्रबंधक',
  },
}

const SORTED_JOB_TITLE_ENTRIES = Object.entries(JOB_TITLE_DICTIONARY).sort(
  (a, b) => b[0].length - a[0].length
)

/**
 * Curated company name dictionary for native transliteration
 */
export const COMPANY_DICTIONARY: Record<string, { ta: string; hi: string }> = {
  'freshworks': {
    ta: 'ஃப்ரெஷ்வொர்க்ஸ்',
    hi: 'फ्रेशवर्क्स',
  },
  'zoho technologies': {
    ta: 'ஜோஹோ டெக்னாலஜிஸ்',
    hi: 'जोहो टेक्नोलॉजीज',
  },
  'zoho': {
    ta: 'ஜோஹோ',
    hi: 'जोहो',
  },
  'saas labs': {
    ta: 'சாஸ் லேப்ஸ்',
    hi: 'सास लैब्स',
  },
  'chennai devs': {
    ta: 'சென்னை டெவ்ஸ்',
    hi: 'चेन्नई डेव्स',
  },
}

/**
 * Synchronous company name translator
 */
export function translateCompanySync(company: string | undefined | null, lang: SupportedLanguage): string {
  if (!company) return ''
  if (lang === 'en') {
    if (!containsTamil(company) && !containsHindi(company)) return company
    const cached = getCachedTranslation(company, 'en')
    if (cached && cached !== company) return cached
    return company
  }
  const lower = company.toLowerCase().trim()
  if (COMPANY_DICTIONARY[lower]?.[lang]) {
    return COMPANY_DICTIONARY[lower][lang]
  }
  return company
}

/**
 * Synchronous job title translator with zero delay
 */
export function translateJobTitleSync(title: string | undefined | null, lang: SupportedLanguage): string {
  if (!title) return ''
  if (lang === 'en') {
    if (!containsTamil(title) && !containsHindi(title)) return title
    const cached = getCachedTranslation(title, 'en')
    if (cached && cached !== title) return cached
    return title
  }
  const lower = title.toLowerCase().trim()

  // 1. Direct match
  if (JOB_TITLE_DICTIONARY[lower]?.[lang]) {
    return JOB_TITLE_DICTIONARY[lower][lang]
  }

  // 2. Memory cache check
  const cacheKey = `${CACHE_KEY_PREFIX}title_${lang}_${lower.slice(0, 100)}`
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!
  }

  // 3. Substring matching for known job titles
  for (const [key, trans] of SORTED_JOB_TITLE_ENTRIES) {
    if (lower.startsWith(key) || lower.includes(key)) {
      const replaced = title.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), trans[lang])
      return replaced
    }
  }

  // 4. Token-level structural translations
  let result = title
  if (lang === 'ta') {
    result = result
      .replace(/\bStaff\b/gi, 'பணியாளர்')
      .replace(/\bPrincipal\b/gi, 'முதன்மை')
      .replace(/\bSenior\b/gi, 'மூத்த')
      .replace(/\bJunior\b/gi, 'இளநிலை')
      .replace(/\bLead\b/gi, 'தலைமை')
      .replace(/\bFull Stack\b/gi, 'முழு அடுக்கு')
      .replace(/\bFrontend\b/gi, 'முன் அடுக்கு')
      .replace(/\bBackend\b/gi, 'பின் அடுக்கு')
      .replace(/\bCloud Native\b/gi, 'கிளவுட் நேட்டிவ்')
      .replace(/\bMobile\b/gi, 'மொபைல்')
      .replace(/\bEngineer\b/gi, 'பொறியாளர்')
      .replace(/\bDeveloper\b/gi, 'டெவலப்பர்')
      .replace(/\bArchitect\b/gi, 'ஆர்க்கிடெக்ட்')
      .replace(/\bDesigner\b/gi, 'வடிவமைப்பாளர்')
      .replace(/\bManager\b/gi, 'மேலாளர்')
      .replace(/\bAnalyst\b/gi, 'பகுப்பாய்வாளர்')
      .replace(/\bSpecialist\b/gi, 'நிபுணர்')
  } else if (lang === 'hi') {
    result = result
      .replace(/\bStaff\b/gi, 'स्टाफ')
      .replace(/\bPrincipal\b/gi, 'प्रधान')
      .replace(/\bSenior\b/gi, 'वरिष्ठ')
      .replace(/\bJunior\b/gi, 'कनिष्ठ')
      .replace(/\bLead\b/gi, 'प्रमुख')
      .replace(/\bFull Stack\b/gi, 'फुल स्टैक')
      .replace(/\bFrontend\b/gi, 'फ्रंटएंड')
      .replace(/\bBackend\b/gi, 'बैकएंड')
      .replace(/\bCloud Native\b/gi, 'क्लाउड नेटिव')
      .replace(/\bMobile\b/gi, 'मोबाइल')
      .replace(/\bEngineer\b/gi, 'इंजीनियर')
      .replace(/\bDeveloper\b/gi, 'डेवलपर')
      .replace(/\bArchitect\b/gi, 'आर्किटेक्ट')
      .replace(/\bDesigner\b/gi, 'डिज़ाइनर')
      .replace(/\bManager\b/gi, 'प्रबंधक')
      .replace(/\bAnalyst\b/gi, 'विश्लेषक')
      .replace(/\bSpecialist\b/gi, 'विशेषज्ञ')
  }

  return result
}

/**
 * Synchronous location translator with zero delay
 */
export function translateLocationSync(location: string | undefined | null, lang: SupportedLanguage): string {
  if (!location) return ''
  const lower = location.toLowerCase().trim()

  if (lang === 'en') {
    if (REVERSE_LOCATION_MAP[lower]) {
      const en = REVERSE_LOCATION_MAP[lower]
      return en
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
    return location
  }

  // 1. Direct match
  if (LOCATION_DICTIONARY[lower]?.[lang]) {
    return LOCATION_DICTIONARY[lower][lang]
  }

  // 2. Check if cache has it
  const cacheKey = `${CACHE_KEY_PREFIX}${lang}_${lower.slice(0, 100)}_${lower.length}`
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!
  }

  // 3. Partial / prefix match using longest matching entry first
  let replaced = location
  for (const [key, trans] of SORTED_LOCATION_ENTRIES) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b|${escaped}`, 'i')
    if (regex.test(replaced)) {
      replaced = replaced.replace(regex, trans[lang])
      break
    }
  }

  // 4. Structural tech park and district keywords
  if (lang === 'ta') {
    replaced = replaced
      .replace(/Global Infocity/gi, 'குளோபல் இன்போசிட்டி')
      .replace(/Infocity/gi, 'இன்போசிட்டி')
      .replace(/Estancia IT Park|Estancia IT P\.\.\.|Estancia IT/gi, 'எஸ்டான்சியா ஐடி பூங்கா')
      .replace(/Estancia/gi, 'எஸ்டான்சியா')
      .replace(/Tech Park/gi, 'டெக் பார்க்')
      .replace(/IT Park/gi, 'ஐடி பூங்கா')
      .replace(/IT Corridor/gi, 'ஐடி காரிடார்')
      .replace(/Industrial Estate/gi, 'தொழிற்பேட்டை')
      .replace(/Tidel Park/gi, 'டைடல் பார்க்')
      .replace(/SIPCOT/gi, 'சிப்காட்')
      .replace(/SIDCO/gi, 'சிட்கோ')
  } else if (lang === 'hi') {
    replaced = replaced
      .replace(/Global Infocity/gi, 'ग्लोबल इंफोसिटी')
      .replace(/Infocity/gi, 'इंफोसिटी')
      .replace(/Estancia IT Park|Estancia IT P\.\.\.|Estancia IT/gi, 'एस्टैंसिया आईटी पार्क')
      .replace(/Estancia/gi, 'एस्टैंसिया')
      .replace(/Tech Park/gi, 'टेक पार्क')
      .replace(/IT Park/gi, 'आईटी पार्क')
      .replace(/IT Corridor/gi, 'आईटी कॉरिडोर')
      .replace(/Industrial Estate/gi, 'औद्योगिक क्षेत्र')
      .replace(/Tidel Park/gi, 'टाइडल पार्क')
      .replace(/SIPCOT/gi, 'सिपकोट')
      .replace(/SIDCO/gi, 'सिडको')
  }

  return replaced
}

/**
 * Asynchronous location translator (falls back to Google AI if not in dictionary)
 */
export async function translateLocation(
  location: string | undefined | null,
  lang: SupportedLanguage
): Promise<string> {
  if (!location) return ''
  if (lang === 'en') return location
  const syncResult = translateLocationSync(location, lang)
  if (syncResult !== location) {
    return syncResult
  }
  return translateWithGoogleAi(location, lang)
}

/**
 * Translate poster / author name (e.g. "Freshworks Recruiter" -> "ஃப்ரெஷ்வொர்க்ஸ் ஆட்சேர்ப்பாளர்")
 */
export function translatePosterName(poster: string | undefined | null, lang: SupportedLanguage): string {
  if (!poster) return ''
  if (lang === 'en') return poster
  let result = poster
  if (lang === 'ta') {
    result = result
      .replace(/Recruiter/gi, 'ஆட்சேர்ப்பாளர்')
      .replace(/HR Manager|HR/gi, 'மனிதவள அதிகாரி')
      .replace(/Admin/gi, 'நிர்வாகி')
      .replace(/Hiring Manager/gi, 'பணியமர்த்தல் மேலாளர்')
      .replace(/Freshworks/gi, 'ஃப்ரெஷ்வொர்க்ஸ்')
      .replace(/Zoho/gi, 'ஜோஹோ')
  } else if (lang === 'hi') {
    result = result
      .replace(/Recruiter/gi, 'भर्तीकर्ता')
      .replace(/HR Manager|HR/gi, 'एचआर प्रबंधक')
      .replace(/Admin/gi, 'व्यवस्थापक')
      .replace(/Hiring Manager/gi, 'नियुक्ति प्रबंधक')
      .replace(/Freshworks/gi, 'फ्रेशवर्क्स')
      .replace(/Zoho/gi, 'जोहो')
  }
  return result
}

/**
 * Format salary string into native language units
 */
export function formatSalary(salary: string | undefined | null, lang: SupportedLanguage): string {
  if (!salary) return ''
  if (lang === 'en') return salary
  if (lang === 'ta') {
    return salary
      .replace(/\bLPA\b/gi, 'லட்சம்/ஆண்டு')
      .replace(/per month|\/month|\/mo\b/gi, 'மாதம்')
      .replace(/per annum|\/year|\/annum\b/gi, 'ஆண்டு')
  }
  if (lang === 'hi') {
    return salary
      .replace(/\bLPA\b/gi, 'लाख/वर्ष')
      .replace(/per month|\/month|\/mo\b/gi, 'प्रति माह')
      .replace(/per annum|\/year|\/annum\b/gi, 'प्रति वर्ष')
  }
  return salary
}

/**
 * Format workplace type string
 */
export function formatWorkplaceType(type: string | undefined | null, lang: SupportedLanguage): string {
  if (!type) return ''
  if (lang === 'en') return type
  const lower = type.toLowerCase()
  if (lower.includes('remote')) {
    return lang === 'ta' ? 'வீட்டிலிருந்தே பணி' : lang === 'hi' ? 'रिमोट' : 'Remote'
  }
  if (lower.includes('hybrid')) {
    return lang === 'ta' ? 'கலப்புப் பணி முறை' : lang === 'hi' ? 'हाइब्रिड' : 'Hybrid'
  }
  if (lower.includes('site') || lower.includes('on')) {
    return lang === 'ta' ? 'நேரடி அலுவலகப் பணி' : lang === 'hi' ? 'ऑन-साइट' : 'On-site'
  }
  return type
}

/**
 * Script and Language Detection Helpers
 */
export const containsTamil = (text: string): boolean => /[\u0B80-\u0BFF]/.test(text)
export const containsHindi = (text: string): boolean => /[\u0900-\u097F]/.test(text)
export const containsLatin = (text: string): boolean => /[a-zA-Z]/.test(text)

/**
 * Checks if a string is non-translatable (URL, email, purely numeric, or code token)
 */
export function isNonTranslatable(text: string): boolean {
  const trimmed = (text || '').trim()
  if (!trimmed) return true
  // URLs
  if (/^https?:\/\/\S+$/i.test(trimmed)) return true
  // Emails
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true
  // Pure numbers, phone numbers, punctuation or symbols (no letters in Latin/Tamil/Devanagari)
  if (!/[a-zA-Z\u0B80-\u0BFF\u0900-\u097F]/.test(trimmed)) return true
  return false
}

/**
 * Checks if a given text is already predominantly in the target language.
 * If true, re-translation can be bypassed safely.
 */
export function isLanguageMatch(text: string, lang: SupportedLanguage): boolean {
  if (!text || !text.trim()) return true
  const trimmed = text.trim()
  if (isNonTranslatable(trimmed)) return true

  if (lang === 'en') {
    // Already English if it contains NO Tamil and NO Hindi characters
    return !containsTamil(trimmed) && !containsHindi(trimmed)
  }
  if (lang === 'ta') {
    // Already Tamil if it contains Tamil and does NOT contain Latin or Hindi characters
    return containsTamil(trimmed) && !containsLatin(trimmed) && !containsHindi(trimmed)
  }
  if (lang === 'hi') {
    // Already Hindi if it contains Hindi and does NOT contain Latin or Tamil characters
    return containsHindi(trimmed) && !containsLatin(trimmed) && !containsTamil(trimmed)
  }
  return false
}

export function getCacheKey(text: string, targetLang: SupportedLanguage): string {
  const trimmed = text.trim()
  return `${CACHE_KEY_PREFIX}${targetLang}_${trimmed.slice(0, 100)}_${trimmed.length}`
}

/**
 * Synchronously retrieves a cached translation if available.
 * Returns the original text if it already matches the target language.
 */
export function getCachedTranslation(
  text: string | null | undefined,
  targetLang: SupportedLanguage
): string | null {
  if (!text) return ''
  const trimmed = text.trim()
  if (!trimmed || isNonTranslatable(trimmed) || isLanguageMatch(trimmed, targetLang)) {
    return text
  }
  const cacheKey = getCacheKey(trimmed, targetLang)
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!
  }
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      memoryCache.set(cacheKey, cached)
      return cached
    }
  } catch {}
  return null
}

/**
 * Translate any text using Google AI / Google Neural Translation into pure target language.
 * Completely bidirectional across English, Tamil, and Hindi.
 */
export async function translateWithGoogleAi(
  text: string,
  targetLang: SupportedLanguage,
  sourceLang: string = 'auto'
): Promise<string> {
  const trimmed = (text || '').trim()
  if (!trimmed) return ''

  // Fast check: is this non-translatable or already matching the target language?
  if (isNonTranslatable(trimmed) || isLanguageMatch(trimmed, targetLang)) {
    return trimmed
  }

  // Detect source language if set to auto
  let effectiveSource = sourceLang
  if (effectiveSource === 'auto') {
    if (containsTamil(trimmed)) effectiveSource = 'ta'
    else if (containsHindi(trimmed)) effectiveSource = 'hi'
    else if (containsLatin(trimmed)) effectiveSource = 'en'
  }

  // Check in-memory / localStorage cache
  const cached = getCachedTranslation(trimmed, targetLang)
  if (cached && cached !== trimmed) {
    return cached
  }

  const cacheKey = getCacheKey(trimmed, targetLang)

  // 1. Try Gemini Generative AI if key is present
  const geminiApiKey =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    (typeof window !== 'undefined' && (window as any)?.__ENV__?.GEMINI_API_KEY)

  if (geminiApiKey) {
    try {
      const purityRule = LANGUAGE_PURITY_PROMPTS[targetLang] || targetLang
      const prompt = `Translate the following text into ${purityRule}:\n\n${trimmed}`
      
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024,
            },
          }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (translated) {
          memoryCache.set(cacheKey, translated)
          try {
            localStorage.setItem(cacheKey, translated)
          } catch {}
          return translated
        }
      }
    } catch (geminiError) {
      console.warn('Gemini direct translation fallback:', geminiError)
    }
  }

  // 2. Robust Google Neural Machine Translation API (client=gtx)
  try {
    const encoded = encodeURIComponent(trimmed)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${effectiveSource}&tl=${targetLang}&dt=t&q=${encoded}`
    const response = await fetch(url)
    
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data?.[0])) {
        const fullTranslation = data[0]
          .map((chunk: any) => (Array.isArray(chunk) && chunk[0] ? chunk[0] : ''))
          .join('')
          .trim()

        if (fullTranslation) {
          memoryCache.set(cacheKey, fullTranslation)
          try {
            localStorage.setItem(cacheKey, fullTranslation)
          } catch {}
          return fullTranslation
        }
      }
    }
  } catch (gtxError) {
    console.warn('Google Translation service error:', gtxError)
  }

  // Return original if network failed
  return trimmed
}

/**
 * Batch translation utility for translating multiple texts in parallel
 */
export async function translateBatchWithGoogleAi(
  texts: string[],
  targetLang: SupportedLanguage
): Promise<string[]> {
  return Promise.all(texts.map((t) => translateWithGoogleAi(t, targetLang)))
}
