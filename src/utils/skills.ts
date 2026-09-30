/**
 * Safely parses skills from any format (JSON array string, comma-separated string, array)
 * and guarantees clean strings with zero brackets, quotes, or trailing punctuation.
 */
export function parseSkillsArray(input: unknown): string[] {
  if (!input) return []

  // If already an array
  if (Array.isArray(input)) {
    return input
      .map((s) => cleanSkillString(s))
      .filter(Boolean)
  }

  // If string
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return []

    // Try parsing as JSON array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((s) => cleanSkillString(s)).filter(Boolean)
        }
      } catch {
        // Fallback to regex cleaning below
      }
    }

    // Strip brackets, quotes, braces and split by comma
    return trimmed
      .replace(/[\[\]"'{}]/g, '')
      .split(',')
      .map((s) => cleanSkillString(s))
      .filter(Boolean)
  }

  return []
}

/**
 * Strips all brackets, quotes, and invalid characters from a single skill string
 */
export function cleanSkillString(s: unknown): string {
  if (!s) return ''
  return String(s)
    .replace(/[\[\]"'{}]/g, '')
    .trim()
}

