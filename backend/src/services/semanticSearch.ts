/**
 * Hybrid Semantic Candidate Search Engine
 * Combines: Structured filtering + Semantic vector similarity + Multilingual natural language intent parsing
 * Supports English, Tamil, and Hindi for all job sectors.
 */

import {
  getEmbedding,
  cosineSimilarity,
  buildEmployeeSearchableText,
} from './embeddingService'

export interface ParsedSearchQuery {
  rawQuery: string
  detectedLocation?: string
  detectedExperienceYears?: number
  detectedKeywords: string[]
  language: 'en' | 'ta' | 'hi'
}

const LOCATION_ALIASES: Record<string, string[]> = {
  Chennai: ['chennai', 'madras', 'சென்னை', 'சென்னையில்', 'चेन्नई'],
  Coimbatore: ['coimbatore', 'kovai', 'கோயம்புத்தூர்', 'கோயம்புத்தூரில்', 'கோவை', 'कोयंबटूर'],
  Madurai: ['madurai', 'மதுரை', 'மதுரையில்', 'மாவை', 'मदुरै'],
  Trichy: ['trichy', 'tiruchirappalli', 'திருச்சி', 'திருச்சிராப்பள்ளி', 'तिरुचिरापल्ली'],
  Salem: ['salem', 'சேலம்', 'சேலத்தில்', 'सलेम'],
  Tirupur: ['tirupur', 'திருப்பூர்', 'திருப்பூரில்', 'तिरुपुर'],
  Erode: ['erode', 'ஈரோடு', 'ஈரோட்டில்', 'इरोड'],
  Vellore: ['vellore', 'வேலூர்', 'வேலூரில்', 'वेल्लोर'],
  Tirunelveli: ['tirunelveli', 'திருநெல்வேலி', 'நெல்லை', 'तिरुनेलवेली'],
  Thanjavur: ['thanjavur', 'தஞ்சாவூர்', 'தஞ்சை', 'तंजौर'],
  Hosur: ['hosur', 'ஓசூர்', 'होसुर'],
}

/**
 * Parses natural language queries in English, Tamil, or Hindi to extract structured signals
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

  const tokens = lower
    .split(/[\s,.;:()!?"'/\\[\]{}]+/)
    .filter((t) => t.length > 1 && !stopWords.has(t))

  return {
    rawQuery: clean,
    detectedLocation,
    detectedExperienceYears,
    detectedKeywords: tokens,
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

  // Check matching candidate skills
  for (const sk of candidateSkills) {
    const skLower = sk.toLowerCase()
    const isMatched =
      (explicitSkill && skLower.includes(explicitSkill.toLowerCase())) ||
      parsedQuery.detectedKeywords.some((kw) => skLower.includes(kw) || kw.includes(skLower)) ||
      (parsedQuery.rawQuery && parsedQuery.rawQuery.toLowerCase().includes(skLower))

    if (isMatched && !matchedSkills.includes(sk)) {
      matchedSkills.push(sk)
    }
  }

  if (matchedSkills.length > 0) {
    matchHighlights.push(`${matchedSkills.length} skills matched`)
  }

  // 3. Location Evaluation
  let locationBonus = 0
  const targetLocation = explicitLocation || parsedQuery.detectedLocation
  if (targetLocation && candidate.location) {
    const candLocLower = candidate.location.toLowerCase()
    const targetLocLower = targetLocation.toLowerCase()

    if (candLocLower.includes(targetLocLower) || targetLocLower.includes(candLocLower)) {
      locationBonus = 1.0
      matchHighlights.push(`Location match: ${candidate.location}`)
    } else {
      // Check aliases
      const aliases = LOCATION_ALIASES[targetLocation] || []
      if (aliases.some((al) => candLocLower.includes(al))) {
        locationBonus = 1.0
        matchHighlights.push(`Location match: ${candidate.location}`)
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
        matchHighlights.push(`${candYears}+ years experience`)
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
    // In dense cosine vector space, similarity >= 0.25 indicates strong domain alignment
    const scaledSimilarity = Math.min(1.0, Math.max(0, (vectorSimilarity - 0.15) / 0.55))
    rawScore =
      scaledSimilarity * 65 +
      keywordRatio * 15 +
      locationBonus * 12 +
      experienceBonus * 8
  } else {
    // Pure structured/keyword fallback score
    rawScore =
      keywordRatio * 60 +
      (matchedSkills.length > 0 ? 25 : 0) +
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
