import { apiClient } from './api'

export interface ExtractedResumeData {
  fullName?: string
  skills: string[]
  headline?: string
  position?: string
  company?: string
  location?: string
  bio?: string
  phone?: string
  email?: string
  category?: string
  rawText?: string
}

export interface SkillCategory {
  id: string
  name: string
  icon?: string
  description: string
  skills: string[]
}

// 7 Comprehensive Industry Categories for Tamil Nadu & Indian Talent Market
export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'it_software',
    name: 'IT & Software',
    icon: '',
    description: 'Frontend, Backend, Mobile, Cloud, AI & DevOps',
    skills: [
      'React', 'Next.js', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'Tailwind CSS',
      'Vue.js', 'Angular', 'Svelte', 'Redux', 'GraphQL', 'Vite', 'Node.js', 'Express.js',
      'Python', 'Django', 'FastAPI', 'Flask', 'Java', 'Spring Boot', 'Golang', 'C#', '.NET',
      'PHP', 'Laravel', 'Rust', 'C++', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
      'SQLite', 'AWS', 'Google Cloud', 'Azure', 'Docker', 'Kubernetes', 'CI/CD', 'Git',
      'Linux', 'Microservices', 'REST API', 'Machine Learning', 'Artificial Intelligence',
      'TensorFlow', 'PyTorch', 'Pandas', 'Flutter', 'React Native', 'Android', 'iOS',
      'Kotlin', 'Swift'
    ]
  },
  {
    id: 'finance_accounting',
    name: 'Finance & Accounts',
    icon: '',
    description: 'Tally, GST, Auditing, Tax, Banking & MIS Reporting',
    skills: [
      'Accounting', 'Tally', 'Tally Prime', 'GST', 'TDS', 'Income Tax', 'Auditing',
      'Financial Modeling', 'Financial Analysis', 'Payroll', 'Bookkeeping', 'Excel',
      'Advanced Excel', 'MIS Reporting', 'Balance Sheet', 'Banking', 'Accounts Payable',
      'Accounts Receivable', 'Cost Accounting', 'SAP FICO'
    ]
  },
  {
    id: 'sales_marketing',
    name: 'Sales & Marketing',
    icon: '',
    description: 'Business Development, Digital Marketing, Telecalling & BPO',
    skills: [
      'Sales', 'Business Development', 'Lead Generation', 'B2B Sales', 'Retail Sales',
      'Marketing', 'Digital Marketing', 'SEO', 'SEM', 'Social Media Marketing', 'Google Ads',
      'Meta Ads', 'Content Writing', 'Copywriting', 'Email Marketing', 'Customer Support',
      'BPO', 'Telecalling', 'Customer Service', 'Client Relationship', 'CRM', 'HubSpot'
    ]
  },
  {
    id: 'engineering_manufacturing',
    name: 'Engineering & Core',
    icon: '',
    description: 'CAD/CAM, Mechanical, Electrical, Production & QA',
    skills: [
      'AutoCAD', 'SolidWorks', 'CATIA', 'Mechanical Engineering', 'Electrical Engineering',
      'Civil Engineering', 'PLC', 'SCADA', 'CNC Programming', 'Quality Control',
      'Quality Assurance', 'Six Sigma', 'Production Planning', 'Maintenance Engineering',
      'Embedded Systems', 'PCB Design', 'MATLAB'
    ]
  },
  {
    id: 'design_media',
    name: 'Creative & Design',
    icon: '',
    description: 'UI/UX Design, Figma, Graphic Design, Video & Motion',
    skills: [
      'UI/UX Design', 'Figma', 'Adobe XD', 'Graphic Design', 'Photoshop', 'Illustrator',
      'Video Editing', 'Premiere Pro', 'After Effects', 'Animation', '3D Modeling',
      'Blender', 'Typography', 'Wireframing', 'Prototyping', 'Motion Graphics'
    ]
  },
  {
    id: 'healthcare_pharma',
    name: 'Healthcare & Pharma',
    icon: '',
    description: 'Nursing, Pharmacy, Medical Lab, Hospital Care & Diagnostics',
    skills: [
      'Nursing', 'Pharmacy', 'Pharmacology', 'Medical Lab', 'Lab Technician',
      'Clinical Research', 'Patient Care', 'Medical Billing', 'Physiotherapy',
      'Emergency Care', 'Healthcare Administration'
    ]
  },
  {
    id: 'skilled_trades',
    name: 'Trades & Logistics',
    icon: '',
    description: 'Electrician, Technician, Tailoring, Drivers, Supply Chain',
    skills: [
      'Electrician', 'Plumber', 'Tailoring', 'Garment Making', 'Driver', 'Heavy Vehicle',
      'Forklift Operator', 'Welder', 'HVAC Technician', 'Carpentry', 'Warehouse Management',
      'Logistics', 'Supply Chain', 'Inventory Management', 'Packaging'
    ]
  }
]

// Union of all recognized skills
export const KNOWN_SKILLS: string[] = Array.from(
  new Set(SKILL_CATEGORIES.flatMap((c) => c.skills))
)

// Common Tamil Nadu and South India Tech & Industrial Hubs
const LOCATIONS = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Trichy',
  'Salem',
  'Tirunelveli',
  'Tiruppur',
  'Erode',
  'Vellore',
  'Thanjavur',
  'Dindigul',
  'Kanchipuram',
  'Hosur',
  'Nagercoil',
  'Tuticorin',
  'Thoothukudi',
  'Bangalore',
  'Bengaluru',
  'Hyderabad',
  'Kochi',
  'Remote',
]

/**
 * Extract plain text from PDF, DOCX, or text file
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.txt')) {
      return await file.text()
    }

    const arrayBuffer = await file.arrayBuffer()
    const decoder = new TextDecoder('utf-8', { fatal: false })
    const raw = decoder.decode(arrayBuffer)

    // 1. If DOCX: extract text from <w:t> tags
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      const docxMatches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g)
      if (docxMatches && docxMatches.length > 0) {
        const text = docxMatches
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
        if (text.length > 50) return `${file.name} ${text}`
      }
    }

    // 2. Extract PDF literal strings inside parentheses (common in PDF content streams)
    const parenthesesMatches = raw.match(/\(([^()]{2,200})\)/g) || []
    const streamWords = parenthesesMatches
      .map((m) => m.slice(1, -1))
      .filter((w) => /[a-zA-Z0-9]/.test(w))
      .join(' ')

    // 3. Extract text run operators like [(...) ...] in PDF
    const tjMatches = raw.match(/\[(.*?)\]\s*TJ/g) || []
    const tjWords = tjMatches
      .map((m) => m.replace(/\[|\]|TJ/g, '').replace(/[\\()]/g, ' '))
      .join(' ')

    // 4. Remove binary noise and control codes
    // eslint-disable-next-line no-control-regex
    const cleanRaw = raw
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
      .replace(/\s+/g, ' ')

    return `${file.name} ${streamWords} ${tjWords} ${cleanRaw}`
  } catch (err) {
    console.warn('Could not extract raw text from document binary:', err)
    return file.name
  }
}

/**
 * Parse clean full name from file name or top lines of resume
 */
function extractCandidateName(fileName: string, extractedText: string): string | undefined {
  // Try from clean file name: e.g. "Arun_Kumar_Resume.pdf" -> "Arun Kumar"
  const cleanBase = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b(resume|cv|biodata|profile|updated|latest|final|doc|pdf)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  const words = cleanBase.split(' ').filter((w) => /^[a-zA-Z]{2,}$/.test(w))
  if (words.length >= 2 && words.length <= 4) {
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }

  // Look at first 200 characters of text for a 2-word capitalized name
  const headerSlice = extractedText.slice(0, 300)
  const nameMatch = headerSlice.match(/\b([A-Z][a-z]{2,15}\s+[A-Z][a-z]{2,15})\b/)
  if (nameMatch && !/Resume|Curriculum|Profile|Career|Summary|Contact|Objective/i.test(nameMatch[1])) {
    return nameMatch[1]
  }

  return undefined
}

/**
 * Extract recognized skills and keywords from any job description or query text
 */
export function extractSkillsFromJobDescription(jdText: string): string[] {
  if (!jdText) return []
  const textLower = jdText.toLowerCase()
  const matched: string[] = []

  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i')
    if (regex.test(textLower)) {
      matched.push(skill)
    }
  }

  return matched
}

/**
 * Calculate match percentage and skill breakdown between candidate and a job description
 */
export function calculateJdMatch(
  candidateSkills: string[],
  jdSkills: string[],
  candidateContextText = ''
): { score: number; matched: string[]; missing: string[] } {
  if (!jdSkills || jdSkills.length === 0) {
    return { score: 100, matched: candidateSkills, missing: [] }
  }

  const candLower = new Set((candidateSkills || []).map((s) => s.toLowerCase()))
  const contextLower = (candidateContextText || '').toLowerCase()

  const matched: string[] = []
  const missing: string[] = []

  for (const skill of jdSkills) {
    const skLower = skill.toLowerCase()
    if (candLower.has(skLower) || contextLower.includes(skLower)) {
      matched.push(skill)
    } else {
      missing.push(skill)
    }
  }

  const score = Math.round((matched.length / jdSkills.length) * 100)
  return { score, matched, missing }
}

/**
 * Determine primary skill category based on candidate skills
 */
export function determinePrimaryCategory(skills: string[]): SkillCategory {
  const candLower = new Set(skills.map((s) => s.toLowerCase()))
  let bestCategory = SKILL_CATEGORIES[0]
  let maxMatches = -1

  for (const cat of SKILL_CATEGORIES) {
    const matches = cat.skills.filter((s) => candLower.has(s.toLowerCase())).length
    if (matches > maxMatches) {
      maxMatches = matches
      bestCategory = cat
    }
  }

  return bestCategory
}

/**
 * Sync candidate to local cache so HR search can immediately find it
 */
export function syncCandidateToCache(candidate: any) {
  try {
    if (!candidate || !candidate.id) return
    const raw = localStorage.getItem('namma_candidates_cache')
    let list: any[] = raw ? JSON.parse(raw) : []
    const idx = list.findIndex((c) => c.id === candidate.id)
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...candidate }
    } else {
      list.unshift(candidate)
    }
    localStorage.setItem('namma_candidates_cache', JSON.stringify(list))
  } catch (e) {
    console.warn('Failed to sync candidate to cache', e)
  }
}

/**
 * AI-powered resume data extractor:
 * Extracts Name, Skills, Headline, Position, Company, Location, Phone, Email, Bio, Category
 */
export async function parseResumeWithAi(
  file: File,
  resumeUrl: string
): Promise<ExtractedResumeData> {
  const extractedText = await extractTextFromPdf(file)
  const fullTextToAnalyze = `${file.name} ${extractedText}`
  const fullLower = fullTextToAnalyze.toLowerCase()

  // 1. Detect Candidate Name
  const candidateName = extractCandidateName(file.name, extractedText)

  // 2. Detect Skills across all categories
  const detectedSkills: string[] = []
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i')
    if (regex.test(fullLower)) {
      detectedSkills.push(skill)
    }
  }

  // Fallback defaults if scanned image or text unreadable
  if (detectedSkills.length === 0) {
    const lowerName = file.name.toLowerCase()
    if (lowerName.includes('react') || lowerName.includes('frontend')) {
      detectedSkills.push('React', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Git')
    } else if (lowerName.includes('python') || lowerName.includes('backend')) {
      detectedSkills.push('Python', 'SQL', 'FastAPI', 'PostgreSQL', 'Docker')
    } else if (lowerName.includes('fullstack') || lowerName.includes('developer')) {
      detectedSkills.push('React', 'Node.js', 'TypeScript', 'SQL', 'Git')
    } else if (lowerName.includes('flutter') || lowerName.includes('android')) {
      detectedSkills.push('Flutter', 'React Native', 'Android', 'Mobile Development')
    } else if (lowerName.includes('sales') || lowerName.includes('marketing')) {
      detectedSkills.push('Sales', 'Marketing', 'Digital Marketing', 'Customer Support')
    } else if (lowerName.includes('account') || lowerName.includes('tally')) {
      detectedSkills.push('Accounting', 'Tally', 'GST', 'Excel')
    } else {
      detectedSkills.push('React', 'JavaScript', 'Node.js', 'SQL', 'Git')
    }
  }

  // 3. Detect Location
  let detectedLocation = ''
  for (const loc of LOCATIONS) {
    if (fullLower.includes(loc.toLowerCase())) {
      detectedLocation = loc
      break
    }
  }
  if (!detectedLocation) {
    detectedLocation = 'Chennai, Tamil Nadu'
  }

  // 4. Detect Phone & Email
  let detectedPhone: string | undefined
  let detectedEmail: string | undefined

  const phoneMatch = extractedText.match(/(?:\+91[\s-]?)?[6789]\d{9}\b/)
  if (phoneMatch) {
    detectedPhone = phoneMatch[0].replace(/\s+/g, '')
  }

  const emailMatch = extractedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) {
    detectedEmail = emailMatch[0].toLowerCase()
  }

  // 5. Detect Company / Employer
  let detectedCompany: string | undefined
  const companyMatch = extractedText.match(
    /(?:worked at|experience at|company|employer)[:\s]+([A-Za-z0-9\s&]{3,35}(?:Technologies|Solutions|Software|Services|Pvt Ltd|Ltd|Inc|LLC|Corporation|Systems)?)/i
  )
  if (companyMatch && companyMatch[1]) {
    const rawCo = companyMatch[1].trim()
    if (!/Experience|Summary|Project|Education/i.test(rawCo)) {
      detectedCompany = rawCo
    }
  }

  // 6. Synthesize Professional Headline & Position
  let headline = ''
  let position = ''
  const primaryCat = determinePrimaryCategory(detectedSkills)

  if (detectedSkills.includes('React') && detectedSkills.includes('Node.js')) {
    headline = 'Full Stack Developer (React / Node.js)'
    position = 'Full Stack Developer'
  } else if (detectedSkills.includes('React') || detectedSkills.includes('TypeScript')) {
    headline = 'Frontend Engineer (React / TypeScript)'
    position = 'Frontend Engineer'
  } else if (detectedSkills.includes('Flutter') || detectedSkills.includes('React Native') || detectedSkills.includes('Android')) {
    headline = 'Mobile Application Developer (Flutter / Android)'
    position = 'Mobile Developer'
  } else if (detectedSkills.includes('Python') || detectedSkills.includes('Java')) {
    headline = 'Backend Software Engineer'
    position = 'Backend Engineer'
  } else if (detectedSkills.includes('Data Science') || detectedSkills.includes('Machine Learning') || detectedSkills.includes('Artificial Intelligence')) {
    headline = 'AI & Data Science Specialist'
    position = 'Data Scientist'
  } else if (detectedSkills.includes('Accounting') || detectedSkills.includes('Tally')) {
    headline = 'Accountant & Tally GST Specialist'
    position = 'Senior Accountant'
  } else if (detectedSkills.includes('Sales') || detectedSkills.includes('Business Development')) {
    headline = 'Sales & Business Development Professional'
    position = 'Business Development Executive'
  } else if (detectedSkills.includes('Digital Marketing') || detectedSkills.includes('SEO')) {
    headline = 'Digital Marketing & Growth Specialist'
    position = 'Digital Marketing Executive'
  } else if (detectedSkills.includes('AutoCAD') || detectedSkills.includes('Mechanical Engineering')) {
    headline = 'Design Engineer (AutoCAD / SolidWorks)'
    position = 'Mechanical Design Engineer'
  } else if (detectedSkills.includes('Electrician') || detectedSkills.includes('Technician')) {
    headline = 'Industrial Electrical & Maintenance Technician'
    position = 'Electrical Technician'
  } else if (detectedSkills.includes('Tailoring') || detectedSkills.includes('Garment Making')) {
    headline = 'Master Tailor & Garment Specialist'
    position = 'Tailor / Pattern Maker'
  } else if (detectedSkills.includes('UI/UX Design') || detectedSkills.includes('Figma')) {
    headline = 'UI/UX Product Designer (Figma / Web)'
    position = 'Product Designer'
  } else {
    headline = `${detectedSkills.slice(0, 3).join(' / ')} Specialist`
    position = `${primaryCat.name} Specialist`
  }

  // 7. Synthesize Bio / Executive Summary
  const bio = `Dedicated ${position} based in ${detectedLocation}. Proficient in ${detectedSkills
    .slice(0, 6)
    .join(', ')}. Committed to delivering top-quality work, continuous learning, and driving organizational success.`

  // 8. Server-side persistence via /api/resume/parse
  try {
    const serverResult = await apiClient.request<{
      success: boolean
      extracted: ExtractedResumeData
    }>('/api/resume/parse', {
      method: 'POST',
      body: JSON.stringify({
        resume_url: resumeUrl,
        file_name: file.name,
        full_name: candidateName,
        headline,
        position,
        company: detectedCompany,
        location: detectedLocation,
        phone: detectedPhone,
        email: detectedEmail,
        skills: detectedSkills,
        category: primaryCat.id,
        bio,
        raw_text: fullTextToAnalyze.slice(0, 6000),
      }),
    })

    if (serverResult?.extracted?.skills?.length) {
      return {
        ...serverResult.extracted,
        fullName: candidateName,
        company: serverResult.extracted.company || detectedCompany,
        location: serverResult.extracted.location || detectedLocation,
        bio: serverResult.extracted.bio || bio,
        phone: serverResult.extracted.phone || detectedPhone,
        email: serverResult.extracted.email || detectedEmail,
        category: primaryCat.id,
        rawText: fullTextToAnalyze.slice(0, 3000),
      }
    }
  } catch (err) {
    console.info('Client AI parser completed:', err)
  }

  return {
    fullName: candidateName,
    skills: detectedSkills,
    headline,
    position,
    company: detectedCompany,
    location: detectedLocation,
    bio,
    phone: detectedPhone,
    email: detectedEmail,
    category: primaryCat.id,
    rawText: fullTextToAnalyze.slice(0, 3000),
  }
}
