/**
 * Hybrid Semantic Candidate Search Engine
 * Combines: Typo-Tolerant Auto-Correction + Semantic Vector Similarity + Domain Role Matching + Multilingual Intent Parsing
 * Supports English, Tamil, and Hindi for all job sectors.
 */

import {
  getEmbedding,
  cosineSimilarity,
  buildEmployeeSearchableText,
} from './embeddingService'

export interface ParsedSearchQuery {
  rawQuery: string
  correctedQuery: string
  isTypoCorrected: boolean
  detectedLocation?: string
  detectedExperienceYears?: number
  detectedKeywords: string[]
  expandedKeywords: string[]
  language: 'en' | 'ta' | 'hi'
}

const LOCATION_ALIASES: Record<string, string[]> = {
  Chennai: ['chennai', 'madras', 'சென்னை', 'சென்னையில்', 'चेन्नई'],
  Coimbatore: ['coimbatore', 'kovai', 'கோயம்புத்தூர்', 'கோயம்புத்தூரில்', 'கோவை', 'कोयंबटूर'],
  Madurai: ['madurai', 'மதுரை', 'மதுரையில்', 'மாவை', 'मदुरै'],
  Trichy: ['trichy', 'tiruchirappalli', 'திருச்சி', 'திருச்சிராப்பள்ளி', 'तिरुचिராपल्ली'],
  Salem: ['salem', 'சேலம்', 'சேலத்தில்', 'सलेम'],
  Tirupur: ['tirupur', 'திருப்பூர்', 'திருப்பூரில்', 'तिरुपुर'],
  Erode: ['erode', 'ஈரோடு', 'ஈரோட்டில்', 'इरोड'],
  Vellore: ['vellore', 'வேலூர்', 'வேலூரில்', 'वेल्लोर'],
  Tirunelveli: ['tirunelveli', 'திருநெல்வேலி', 'நெல்லை', 'तिरुनेलवेली'],
  Thanjavur: ['thanjavur', 'தஞ்சாவூர்', 'தஞ்சை', 'तंजौर'],
  Hosur: ['hosur', 'ஓசூர்', 'होसुर'],
}

/**
 * Standard Vocabulary for Typo Tolerance & Spell Correction
 */
const CANONICAL_CORRECTION_VOCABULARY = [
  // Software / IT Roles & Terms
  'software', 'developer', 'developers', 'development', 'engineer', 'engineers', 'engineering',
  'programmer', 'programmers', 'frontend', 'backend', 'fullstack', 'coder', 'coders',
  'web', 'mobile', 'architect', 'lead', 'devops', 'tester', 'qa', 'testing', 'specialist',
  'application', 'database', 'system', 'cloud', 'security',

  // Tech Skills
  'react', 'reactjs', 'nextjs', 'vue', 'angular', 'svelte', 'typescript', 'javascript',
  'nodejs', 'express', 'python', 'django', 'fastapi', 'java', 'springboot', 'c#', 'csharp',
  'dotnet', 'php', 'laravel', 'golang', 'rust', 'sql', 'mysql', 'postgresql', 'postgres',
  'mongodb', 'redis', 'firebase', 'sqlite', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
  'html', 'html5', 'css', 'css3', 'tailwind', 'bootstrap', 'redux', 'graphql', 'rest', 'api',
  'flutter', 'react native', 'android', 'ios', 'swift', 'kotlin', 'git', 'linux',
  'machine learning', 'artificial intelligence', 'data science',

  // Finance / Accounting Roles & Skills
  'accountant', 'accountants', 'accounting', 'accounts', 'auditor', 'auditing', 'bookkeeper',
  'bookkeeping', 'cashier', 'taxation', 'finance', 'financial', 'banking',
  'tally', 'tally prime', 'gst', 'tds', 'excel', 'payroll', 'mis', 'income tax',

  // Trades & Engineering Roles & Skills
  'electrician', 'electricians', 'electrical', 'technician', 'technicians', 'plumber',
  'plumbers', 'welder', 'welders', 'fitter', 'carpenter', 'mechanic', 'machinist', 'operator',
  'autocad', 'solidworks', 'catia', 'cnc', 'plc', 'scada', 'wiring', 'maintenance',

  // Healthcare Roles & Skills
  'nurse', 'nurses', 'nursing', 'doctor', 'pharmacist', 'pharmacy', 'hospital', 'healthcare',
  'patient care', 'clinical', 'medical',

  // Services, Sales, Admin & Logistics
  'driver', 'drivers', 'driving', 'sales', 'marketing', 'marketer', 'telecaller', 'telecalling',
  'bpo', 'executive', 'manager', 'recruiter', 'recruiters', 'recruitment', 'hr', 'human resources',
  'customer support', 'retail', 'warehouse', 'logistics', 'designer', 'tailor', 'tailoring',
]

/**
 * Domain Role Synonyms & Skill Expansions
 * Links job titles to related skills and equivalent titles
 */
const DOMAIN_ROLE_SYNONYMS: Record<string, string[]> = {
  developer: [
    'developer', 'developers', 'engineer', 'engineers', 'frontend', 'backend', 'fullstack',
    'programmer', 'programmers', 'coder', 'coders', 'software', 'web', 'it',
    'react', 'typescript', 'javascript', 'node.js', 'python', 'java', 'c#', 'php', 'android', 'ios', 'flutter'
  ],
  developers: [
    'developer', 'developers', 'engineer', 'engineers', 'frontend', 'backend', 'fullstack',
    'programmer', 'programmers', 'coder', 'software', 'it', 'web',
    'react', 'typescript', 'javascript', 'node.js', 'python', 'java', 'c#', 'php'
  ],
  software: [
    'software', 'developer', 'developers', 'engineer', 'engineers', 'frontend', 'backend', 'fullstack',
    'programmer', 'programmers', 'it', 'web', 'coder',
    'react', 'typescript', 'javascript', 'node.js', 'python', 'java', 'c#', 'php', 'android', 'ios'
  ],
  engineer: [
    'engineer', 'engineers', 'developer', 'software', 'frontend', 'backend', 'fullstack',
    'mechanical', 'electrical', 'civil'
  ],
  frontend: [
    'frontend', 'front-end', 'ui', 'web', 'react', 'typescript', 'javascript', 'html', 'css',
    'developer', 'engineer', 'software'
  ],
  backend: [
    'backend', 'back-end', 'api', 'server', 'node.js', 'python', 'java', 'c#', 'sql', 'database',
    'developer', 'engineer', 'software'
  ],
  accountant: [
    'accountant', 'accountants', 'accounting', 'accounts', 'finance', 'financial', 'auditor', 'tally',
    'gst', 'tds', 'excel', 'bookkeeping'
  ],
  accountants: [
    'accountant', 'accountants', 'accounting', 'accounts', 'finance', 'financial', 'tally', 'gst', 'tds'
  ],
  electrician: [
    'electrician', 'electricians', 'electrical', 'technician', 'wiring', 'maintenance'
  ],
  nurse: [
    'nurse', 'nurses', 'nursing', 'patient care', 'healthcare', 'medical', 'hospital', 'clinical'
  ],
  sales: [
    'sales', 'marketing', 'business development', 'bda', 'bde', 'telecaller', 'telecalling', 'bpo', 'crm'
  ],
}

/**
 * Standard Levenshtein Distance Algorithm
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/**
 * Intelligent Spell-Checker / Auto-Correction
 * Corrects user typos like "developersdg" -> "developer", "softwar" -> "software", "rect" -> "react"
 */
export function autoCorrectToken(token: string): string {
  const clean = token.toLowerCase().trim()
  if (clean.length < 3) return clean

  // 1. Exact match check
  if (CANONICAL_CORRECTION_VOCABULARY.includes(clean)) {
    return clean
  }

  // 2. Prefix / Trailing keystroke check (e.g., "developersdg" starts with "developer" or "developers")
  for (const vocab of CANONICAL_CORRECTION_VOCABULARY) {
    if (vocab.length >= 5 && clean.startsWith(vocab) && clean.length - vocab.length <= 4) {
      return vocab
    }
  }

  // 3. Levenshtein Distance & Similarity matching
  let bestMatch = clean
  let highestSimilarity = 0

  for (const vocab of CANONICAL_CORRECTION_VOCABULARY) {
    const dist = levenshteinDistance(clean, vocab)
    const maxLen = Math.max(clean.length, vocab.length)
    const similarity = 1 - dist / maxLen

    // Thresholds:
    // Long words (>= 8 chars): allow up to 3 edits if similarity >= 0.70
    // Medium words (5-7 chars): allow up to 2 edits if similarity >= 0.75
    // Short words (3-4 chars): allow up to 1 edit if similarity >= 0.75
    const isCandidate =
      (maxLen >= 8 && dist <= 3 && similarity >= 0.70) ||
      (maxLen >= 5 && dist <= 2 && similarity >= 0.75) ||
      (maxLen >= 3 && dist <= 1 && similarity >= 0.75)

    if (isCandidate && similarity > highestSimilarity) {
      highestSimilarity = similarity
      bestMatch = vocab
    }
  }

  return bestMatch
}

/**
 * Parses natural language queries in English, Tamil, or Hindi to extract structured signals
 * with built-in spell auto-correction and synonym expansion
 */
export function parseNaturalLanguageQuery(query: string): ParsedSearchQuery {
  const clean = (query || '').trim()
  const lower = clean.toLowerCase()

  // Detect query language based on Unicode script
  let language: 'en' | 'ta' | 'hi' = 'en'
  if (/[\u0B80-\u0BFF]/.test(clean)) {
    language = 'ta'
  } else if (/[\u0900-\u097F]/.test(clean)) {
    language = 'hi'
  }

  // 1. Detect location
  let detectedLocation: string | undefined
  for (const [canonicalLoc, aliases] of Object.entries(LOCATION_ALIASES)) {
    for (const alias of aliases) {
      if (lower.includes(alias)) {
        detectedLocation = canonicalLoc
        break
      }
    }
    if (detectedLocation) break
  }

  // 2. Detect experience in years (e.g., "5 years", "5+ years", "5 வருட", "5 साल")
  let detectedExperienceYears: number | undefined
  const expMatch =
    lower.match(/(\d+)\s*(?:\+|\s*plus)?\s*(?:years?|yrs?|வருட|வருஷம்|ஆண்டு|साल)/i)
  if (expMatch) {
    const num = parseInt(expMatch[1], 10)
    if (!isNaN(num) && num > 0 && num < 50) {
      detectedExperienceYears = num
    }
  }

  // 3. Extract keywords without stop words
  const stopWords = new Set([
    'find', 'search', 'looking', 'for', 'with', 'in', 'at', 'and', 'or', 'the', 'an', 'a',
    'experienced', 'experience', 'who', 'has', 'have', 'can', 'people', 'person', 'employees', 'candidates',
    'தேடு', 'கண்டுபிடி', 'உள்ள', 'கொண்ட', 'வேலை', 'ஆட்கள்', 'பணியாளர்கள்',
    'खोजें', 'चाहिए', 'वाले', 'के', 'में', 'अनुभवी', 'उम्मीदवार',
  ])

  const rawTokens = lower
    .split(/[\s,.;:()!?"'/\\[\]{}]+/)
    .filter((t) => t.length > 1 && !stopWords.has(t))

  // 4. Auto-correct spelling of each token in English
  const correctedTokens: string[] = []
  let isTypoCorrected = false

  for (const tok of rawTokens) {
    if (language === 'en') {
      const corrected = autoCorrectToken(tok)
      if (corrected !== tok) {
        isTypoCorrected = true
      }
      correctedTokens.push(corrected)
    } else {
      correctedTokens.push(tok)
    }
  }

  // 5. Expand domain synonyms
  const expandedKeywordsSet = new Set<string>(correctedTokens)
  for (const tok of correctedTokens) {
    const syns = DOMAIN_ROLE_SYNONYMS[tok]
    if (syns) {
      for (const s of syns) {
        expandedKeywordsSet.add(s)
      }
    }
  }

  const correctedQuery = correctedTokens.join(' ')

  return {
    rawQuery: clean,
    correctedQuery,
    isTypoCorrected,
    detectedLocation,
    detectedExperienceYears,
    detectedKeywords: correctedTokens,
    expandedKeywords: Array.from(expandedKeywordsSet),
    language,
  }
}

/**
 * Evaluates semantic match score and highlights for a candidate
 */
export function scoreCandidateMatch(params: {
  candidate: any
  queryEmbedding?: number[]
  candidateEmbedding?: number[]
  parsedQuery: ParsedSearchQuery
  explicitLocation?: string
  explicitSkill?: string
}): {
  matchScore: number
  matchedSkills: string[]
  matchHighlights: string[]
} {
  const {
    candidate,
    queryEmbedding,
    candidateEmbedding,
    parsedQuery,
    explicitLocation,
    explicitSkill,
  } = params

  const candidateSkills: string[] = Array.isArray(candidate.skills)
    ? candidate.skills
    : []

  const candText = buildEmployeeSearchableText(candidate).toLowerCase()
  const matchedSkills: string[] = []
  const matchHighlights: string[] = []

  // 1. Vector Semantic Similarity
  let vectorSimilarity = 0
  if (queryEmbedding && candidateEmbedding) {
    vectorSimilarity = cosineSimilarity(queryEmbedding, candidateEmbedding)
  }

  // 2. Keyword & Skills Matching
  let keywordHits = 0
  for (const kw of parsedQuery.detectedKeywords) {
    if (candText.includes(kw)) {
      keywordHits++
    }
  }

  // Check matching candidate skills (against detected keywords + expanded domain skills)
  for (const sk of candidateSkills) {
    const skLower = sk.toLowerCase()
    const isDirectMatch =
      (explicitSkill && skLower.includes(explicitSkill.toLowerCase())) ||
      parsedQuery.detectedKeywords.some((kw) => skLower.includes(kw) || kw.includes(skLower)) ||
      (parsedQuery.correctedQuery && parsedQuery.correctedQuery.toLowerCase().includes(skLower))

    const isExpandedMatch =
      !isDirectMatch &&
      parsedQuery.expandedKeywords.some((kw) => skLower === kw || skLower.includes(kw))

    if ((isDirectMatch || isExpandedMatch) && !matchedSkills.includes(sk)) {
      matchedSkills.push(sk)
    }
  }

  // Check role / headline match
  const candidatePosition = (candidate.position || '').toLowerCase()
  const candidateHeadline = (candidate.headline || '').toLowerCase()
  let roleMatchFound = false

  for (const kw of parsedQuery.detectedKeywords) {
    if (candidatePosition.includes(kw) || candidateHeadline.includes(kw)) {
      roleMatchFound = true
      break
    }
  }

  if (!roleMatchFound) {
    for (const kw of parsedQuery.expandedKeywords) {
      if (candidatePosition.includes(kw) || candidateHeadline.includes(kw)) {
        roleMatchFound = true
        break
      }
    }
  }

  if (roleMatchFound) {
    matchHighlights.push(`Role match: ${candidate.position || candidate.headline || 'Specialist'}`)
  }

  if (matchedSkills.length > 0) {
    matchHighlights.push(`${matchedSkills.length} skills matched: ${matchedSkills.slice(0, 3).join(', ')}`)
  }

  // 3. Location Evaluation
  let locationBonus = 0
  const targetLocation = explicitLocation || parsedQuery.detectedLocation
  if (targetLocation && candidate.location) {
    const candLocLower = candidate.location.toLowerCase()
    const targetLocLower = targetLocation.toLowerCase()

    if (candLocLower.includes(targetLocLower) || targetLocLower.includes(candLocLower)) {
      locationBonus = 1.0
      matchHighlights.push(`Location: ${candidate.location}`)
    } else {
      const aliases = LOCATION_ALIASES[targetLocation] || []
      if (aliases.some((al) => candLocLower.includes(al))) {
        locationBonus = 1.0
        matchHighlights.push(`Location: ${candidate.location}`)
      }
    }
  }

  // 4. Experience Evaluation
  let experienceBonus = 0
  if (parsedQuery.detectedExperienceYears !== undefined) {
    const expReq = parsedQuery.detectedExperienceYears
    const bioText = (candidate.bio || '').toLowerCase()
    const headline = (candidate.headline || '').toLowerCase()

    const candExpMatch = `${bioText} ${headline}`.match(/(\d+)\s*(?:\+|\s*plus)?\s*(?:years?|yrs?)/i)
    if (candExpMatch) {
      const candYears = parseInt(candExpMatch[1], 10)
      if (candYears >= expReq) {
        experienceBonus = 1.0
        matchHighlights.push(`${candYears}+ yrs experience`)
      }
    } else if (headline.includes('senior') || headline.includes('lead') || bioText.includes('senior')) {
      if (expReq >= 3) {
        experienceBonus = 0.8
        matchHighlights.push('Senior experience')
      }
    }
  }

  // 5. Blended Hybrid Score Calculation (0 - 100%)
  const keywordRatio =
    parsedQuery.detectedKeywords.length > 0
      ? Math.min(1.0, keywordHits / Math.max(1, parsedQuery.detectedKeywords.length))
      : 0

  let rawScore = 0

  if (vectorSimilarity > 0) {
    const scaledSimilarity = Math.min(1.0, Math.max(0, (vectorSimilarity - 0.15) / 0.55))
    rawScore =
      scaledSimilarity * 65 +
      keywordRatio * 15 +
      locationBonus * 12 +
      experienceBonus * 8
  } else {
    // Pure structured/fuzzy scoring
    const skillBonus = Math.min(25, matchedSkills.length * 8)
    rawScore =
      keywordRatio * 35 +
      (roleMatchFound ? 35 : 0) +
      skillBonus +
      locationBonus * 10 +
      experienceBonus * 5
  }

  // Clamp and format match score
  const finalScore = Math.min(99, Math.max(0, Math.round(rawScore)))

  return {
    matchScore: finalScore,
    matchedSkills,
    matchHighlights,
  }
}
