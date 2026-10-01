/**
 * Local Multilingual Embedding Service for Namma Ooru Jobs
 * Supports: BAAI/bge-m3 local microservice via HTTP + Built-in offline Multilingual Semantic Vectorizer.
 * Languages: English, Tamil (தமிழ்), Hindi (हिन्दी) & Cross-Language.
 * Covers ALL sectors: IT, Healthcare, Construction, Manufacturing, Finance, Hospitality, Automobile, Skilled Trades, etc.
 */

export const EMBEDDING_DIMENSION = 256
declare const process: any

// Cross-lingual semantic concept dictionary to map Tamil, Hindi & English terms into shared semantic space
const CROSS_LINGUAL_CONCEPTS: Array<{
  concept: string
  terms: string[]
  weight: number
}> = [
  // 1. Healthcare & Medicine
  {
    concept: 'healthcare_nurse',
    terms: ['nurse', 'nursing', 'staff nurse', 'anm', 'gnm', 'செவிலியர்', 'நர்ஸ்', 'மருத்துவ செவிலியர்', 'மருத்துவமனை பணியாளர்', 'नर्स', 'स्टाफ नर्स', 'उपचारिका'],
    weight: 2.0,
  },
  {
    concept: 'healthcare_doctor',
    terms: ['doctor', 'physician', 'surgeon', 'mbbs', 'clinic', 'மருத்துவர்', 'டாக்டர்', 'மருத்துவ அதிகாரி', 'डॉक्टर', 'चिकित्सक', 'वैद्य'],
    weight: 2.0,
  },
  {
    concept: 'healthcare_pharmacist',
    terms: ['pharmacist', 'pharmacy', 'chemist', 'மருந்தாளர்', 'மருந்து கடை', 'फार्मासिस्ट', 'दवा विक्रेता'],
    weight: 1.8,
  },

  // 2. Information Technology & Software
  {
    concept: 'it_developer',
    terms: ['developer', 'software engineer', 'programmer', 'coder', 'மென்பொருள் பொறியாளர்', 'டெவலப்பர்', 'ப்ரோக்ராமர்', 'सॉफ्टवेयर इंजीनियर', 'डेवलपर', 'प्रोग्रामर'],
    weight: 2.0,
  },
  {
    concept: 'it_java',
    terms: ['java', 'spring', 'springboot', 'hibernate', 'ஜாவா', 'जावा'],
    weight: 2.0,
  },
  {
    concept: 'it_frontend',
    terms: ['react', 'reactjs', 'frontend', 'front end', 'typescript', 'javascript', 'vue', 'angular', 'ரியாக்ட்', 'முன்-பகுதி டெவலப்பர்', 'रिएक्ट', 'फ्रंटएंड'],
    weight: 2.0,
  },
  {
    concept: 'it_python',
    terms: ['python', 'django', 'fastapi', 'flask', 'பைதான்', 'पायथन'],
    weight: 2.0,
  },

  // 3. Electrical & Electronics
  {
    concept: 'trade_electrician',
    terms: ['electrician', 'electrical', 'wiring', 'motor rewinding', 'substation', 'maintenance electrician', 'எலக்ட்ரீஷியன்', 'மின்சார பணியாளர்', 'மின்சார வல்லுநர்', 'இணைப்பு பணியாளர்', 'इलेक्ट्रीशियन', 'बिजली मिस्त्री', 'विद्युत तकनीशियन'],
    weight: 2.0,
  },

  // 4. Plumbing & Piping
  {
    concept: 'trade_plumber',
    terms: ['plumber', 'plumbing', 'pipe fitter', 'pipefitting', 'sanitary', 'பிளம்பர்', 'குழாய் பணியாளர்', 'நீர் குழாய் அமைப்பாளர்', 'प्लंबर', 'नलसाज', 'पाइप फिटर'],
    weight: 2.0,
  },

  // 5. Accounting, Finance & Banking
  {
    concept: 'finance_accountant',
    terms: ['accountant', 'accounts', 'accounting', 'auditor', 'bookkeeper', 'கணக்காளர்', 'அக்கவுண்டன்ட்', 'கணக்கு தணிக்கையாளர்', 'நிதி உதவியாளர்', 'लेखाकार', 'अकाउंटेंट', 'मुनीम', 'ऑडिटर'],
    weight: 2.0,
  },
  {
    concept: 'finance_gst_tally',
    terms: ['tally', 'gst', 'taxation', 'tds', 'balance sheet', 'ஜிஎஸ்டி', 'டேலி', 'வரி தாக்கல்', 'जीएसटी', 'टैली', 'कराधान'],
    weight: 2.0,
  },
  {
    concept: 'finance_banking',
    terms: ['banking', 'bank manager', 'cashier', 'loan officer', 'வங்கி', 'வங்கி பணியாளர்', 'காசாளர்', 'बैंकिंग', 'बैंक', 'कैशियर'],
    weight: 1.8,
  },

  // 6. Construction, Civil & Architecture
  {
    concept: 'construction_supervisor',
    terms: ['construction supervisor', 'site supervisor', 'civil supervisor', 'site engineer', 'civil engineer', 'மேற்பார்வையாளர்', 'கட்டுமான மேற்பார்வையாளர்', 'சைட் சூப்பர்வைசர்', 'மேஸ்திரி', 'строительство', 'निर्माण पर्यवेक्षक', 'साइट इंजीनियर', 'फोरमैन'],
    weight: 2.0,
  },
  {
    concept: 'construction_mason',
    terms: ['mason', 'masonry', 'bricklayer', 'கட்டுமான தொழிலாளி', 'கொத்தனார்', 'राजमिस्त्री', 'कारीगर'],
    weight: 1.8,
  },

  // 7. Manufacturing, Mechanical & Automobile
  {
    concept: 'mfg_cnc',
    terms: ['cnc', 'cnc operator', 'cnc programmer', 'vmc', 'lathe', 'இயந்திர ஆபரேட்டர்', 'சிஎன்சி ஆப்பரேட்டர்', 'सीएनसी ऑपरेटर', 'लेथ मशीन'],
    weight: 2.0,
  },
  {
    concept: 'mfg_welder',
    terms: ['welder', 'welding', 'fabricator', 'fabrication', 'வெல்டர்', 'வெல்டிங்', 'பொருத்துநர்', 'वेल्डर', 'वेल्डिंग', 'फैब्रिकेटर'],
    weight: 1.9,
  },
  {
    concept: 'auto_mechanic',
    terms: ['mechanic', 'automobile mechanic', 'auto technician', 'diesel mechanic', 'மெக்கானிக்', 'மோட்டார் மெக்கானிக்', 'பழுது பார்ப்பவர்', 'मैकेनिक', 'ऑटोमोबाइल तकनीशियन'],
    weight: 2.0,
  },

  // 8. Hospitality, Hotel & Cooking
  {
    concept: 'hospitality_hotel',
    terms: ['hotel manager', 'hospitality', 'restaurant manager', 'front desk', 'hotel operations', 'ஹோட்டல் மேலாளர்', 'விடுதி மேலாளர்', 'உணவக நிர்வாகி', 'ஹோட்டல் பணி', 'होटल प्रबंधक', 'होटल संचालन', 'आतिथ्य'],
    weight: 2.0,
  },
  {
    concept: 'hospitality_chef',
    terms: ['chef', 'cook', 'baker', 'culinary', 'சமையல்காரர்', 'தலைமை சமையல்காரர்', 'பேக்கரி', 'शेफ', 'रसोइया', 'बावर्ची'],
    weight: 1.9,
  },

  // 9. Sales, Marketing & Retail
  {
    concept: 'sales_executive',
    terms: ['sales executive', 'sales manager', 'field sales', 'business development', 'bde', 'விற்பனை அதிகாரி', 'விற்பனை பிரதிநிதி', 'விற்பனையாளர்', 'வணிக மேம்பாடு', 'बिक्री कार्यकारी', 'सेल्समैन', 'व्यवसाय विकास'],
    weight: 2.0,
  },
  {
    concept: 'marketing_digital',
    terms: ['digital marketing', 'marketing manager', 'seo', 'social media marketing', 'சந்தைப்படுத்தல்', 'விளம்பரம்', 'मार्केटिंग', 'विपणन'],
    weight: 1.8,
  },

  // 10. Logistics, Transportation & Driving
  {
    concept: 'transport_driver',
    terms: ['driver', 'heavy vehicle driver', 'bus driver', 'truck driver', 'cab driver', 'chauffeur', 'ஓட்டுநர்', 'டிரைவர்', 'கனரக வாகன ஓட்டுநர்', 'चालक', 'ड्राइवर'],
    weight: 2.0,
  },
  {
    concept: 'logistics_warehouse',
    terms: ['warehouse', 'logistics', 'delivery', 'dispatch', 'பொருளாதார கிடங்கு', 'சரக்கு விநியோகம்', 'वेयरहाउस', 'लॉजिस्टिक्स', 'डिलीवरी'],
    weight: 1.8,
  },

  // 11. Textiles, Garments & Agriculture
  {
    concept: 'textiles_tailor',
    terms: ['tailor', 'garments', 'stitching', 'pattern maker', 'textile', 'தையல்காரர்', 'ஆடை தயாரிப்பாளர்', 'நெசவாளர்', 'दर्जी', 'कपड़ा उद्योग', 'सिलाई'],
    weight: 1.9,
  },
  {
    concept: 'agriculture_farming',
    terms: ['agriculture', 'farming', 'farm manager', 'horticulture', 'விவசாயி', 'பண்ணை பராமரிப்பாளர்', 'வேளாண்மை', 'कृषि', 'किसान', 'खेती'],
    weight: 1.9,
  },

  // 12. Education & Teaching
  {
    concept: 'education_teacher',
    terms: ['teacher', 'faculty', 'lecturer', 'professor', 'tutor', 'ஆசிரியர்', 'பேராசிரியர்', 'விரிவுரையாளர்', 'கல்வி', 'शिक्षक', 'अध्यापक', 'प्रोफेसर'],
    weight: 2.0,
  },

  // 13. Experience & Seniority Levels
  {
    concept: 'exp_senior',
    terms: ['senior', 'experienced', 'lead', 'head', 'expert', 'specialist', 'முதுநிலை', 'அனுபவம் வாய்ந்த', 'அனுபவமிக்க', 'அனுபவம் உள்ள', 'தலைவர்', 'वरिष्ठ', 'अनुभवी', 'विशेषज्ञ'],
    weight: 1.6,
  },
  {
    concept: 'exp_junior',
    terms: ['fresher', 'trainee', 'entry level', 'junior', 'ஆரம்ப நிலை', 'பயிற்சி பணியாளர்', 'புதுமுக', 'प्रशिक्षु', 'फ्रेशर', 'जूनियर'],
    weight: 1.5,
  },

  // 14. Locations (Tamil Nadu Hubs)
  {
    concept: 'loc_chennai',
    terms: ['chennai', 'madras', 'சென்னை', 'சென்னையில்', 'चेन्नई', 'मद्रास'],
    weight: 2.2,
  },
  {
    concept: 'loc_coimbatore',
    terms: ['coimbatore', 'kovai', 'கோயம்புத்தூர்', 'கோயம்புத்தூரில்', 'கோவை', 'कोयंबटूर'],
    weight: 2.2,
  },
  {
    concept: 'loc_madurai',
    terms: ['madurai', 'மதுரை', 'மதுரையில்', 'मदुरै'],
    weight: 2.2,
  },
  {
    concept: 'loc_trichy',
    terms: ['trichy', 'tiruchirappalli', 'திருச்சி', 'திருச்சிராப்பள்ளி', 'तिरुचिरापल्ली'],
    weight: 2.2,
  },
  {
    concept: 'loc_salem',
    terms: ['salem', 'சேலம்', 'சேலத்தில்', 'सलेम'],
    weight: 2.2,
  },
  {
    concept: 'loc_tirupur',
    terms: ['tirupur', 'திருப்பூர்', 'திருப்பூரில்', 'तिरुपुर'],
    weight: 2.2,
  },
  {
    concept: 'loc_erode',
    terms: ['erode', 'ஈரோடு', 'ஈரோட்டில்', 'इरोड'],
    weight: 2.2,
  },
]

/**
 * Normalizes vector to unit length (L2 norm = 1)
 */
export function normalizeVector(vec: number[]): number[] {
  let sumSq = 0
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i]
  }
  const mag = Math.sqrt(sumSq)
  if (mag === 0) return vec
  return vec.map((v) => v / mag)
}

/**
 * Computes Cosine Similarity between two unit-normalized vectors.
 * Returns a value between -1.0 and 1.0 (clamped to 0.0 - 1.0).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0
  let dotProduct = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
  }
  return Math.max(0, Math.min(1, dotProduct))
}

/**
 * Computes a deterministic hash index for token bucketing
 */
function hashString(str: string, seed: number): number {
  let h = seed ^ 0x12345678
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995)
    h ^= h >>> 15
  }
  return Math.abs(h)
}

/**
 * Built-in Offline Fast Multilingual Semantic Vectorizer.
 * Creates a high-density 256-dimensional unit embedding across English, Tamil and Hindi.
 */
export function computeLocalMultilingualEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSION).fill(0)
  if (!text || typeof text !== 'string') return vector

  const clean = text.toLowerCase().trim()
  if (clean.length === 0) return vector

  // 1. Cross-Lingual Concept Projection (First 128 dimensions)
  // Maps matched semantic concepts to designated coordinate buckets
  for (let cIdx = 0; cIdx < CROSS_LINGUAL_CONCEPTS.length; cIdx++) {
    const item = CROSS_LINGUAL_CONCEPTS[cIdx]
    let matched = false
    for (const term of item.terms) {
      if (clean.includes(term.toLowerCase())) {
        matched = true
        break
      }
    }

    if (matched) {
      const dimBase = (cIdx * 7) % 128
      vector[dimBase] += item.weight
      vector[(dimBase + 1) % 128] += item.weight * 0.75
      vector[(dimBase + 2) % 128] += item.weight * 0.5
    }
  }

  // 2. Token Character N-Gram & Subword Feature Hashing (Dimensions 128 to 255)
  // Tokenize words, including Tamil and Devanagari script blocks
  const tokens = clean.split(/[\s,.;:()!?"'/\\[\]{}]+/).filter((t) => t.length > 0)
  for (const token of tokens) {
    // Word hash
    const idx1 = 128 + (hashString(token, 0) % 128)
    vector[idx1] += 1.0

    // Character 3-grams
    if (token.length >= 3) {
      for (let i = 0; i <= token.length - 3; i++) {
        const trigram = token.slice(i, i + 3)
        const idx2 = 128 + (hashString(trigram, 1) % 128)
        vector[idx2] += 0.4
      }
    }
  }

  return normalizeVector(vector)
}

/**
 * Generate embedding for text.
 * Attempts local BGE-M3 microservice if EMBEDDING_SERVICE_URL is reachable.
 * Falls back transparently to built-in Multilingual Semantic Vectorizer.
 */
export async function getEmbedding(text: string, serviceUrl?: string): Promise<number[]> {
  const targetUrl = serviceUrl || (typeof process !== 'undefined' ? process.env?.EMBEDDING_SERVICE_URL : undefined)

  if (targetUrl) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1200)

      const response = await fetch(`${targetUrl.replace(/\/$/, '')}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        const data = (await response.json()) as { embedding: number[] }
        if (Array.isArray(data.embedding) && data.embedding.length > 0) {
          return normalizeVector(data.embedding)
        }
      }
    } catch {
      // Microservice is offline or timed out; continue to built-in fallback
    }
  }

  // Fallback: fast local multilingual vectorizer
  return computeLocalMultilingualEmbedding(text)
}

/**
 * Generates searchable profile text from an employee user record.
 */
export function buildEmployeeSearchableText(user: {
  full_name?: string
  headline?: string
  position?: string
  company?: string
  location?: string
  bio?: string
  skills?: string | string[]
  language?: string
}): string {
  const parts: string[] = []

  if (user.full_name) parts.push(`Name: ${user.full_name}`)
  if (user.position || user.headline) parts.push(`Role: ${user.position || user.headline}`)
  if (user.company) parts.push(`Company: ${user.company}`)
  if (user.location) parts.push(`Location: ${user.location}`)

  if (user.skills) {
    let skillsList: string[] = []
    if (Array.isArray(user.skills)) {
      skillsList = user.skills
    } else {
      try {
        skillsList = JSON.parse(user.skills)
      } catch {
        skillsList = String(user.skills).split(',').map((s) => s.trim()).filter(Boolean)
      }
    }
    if (skillsList.length > 0) {
      parts.push(`Skills: ${skillsList.join(', ')}`)
    }
  }

  if (user.bio) parts.push(`About: ${user.bio}`)
  if (user.language) parts.push(`Language: ${user.language}`)

  return parts.join(' | ')
}
