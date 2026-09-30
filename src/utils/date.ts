/**
 * Safely parses any date string (ISO 8601, SQLite UTC 'YYYY-MM-DD HH:MM:SS', etc.)
 * Ensures UTC database timestamps are correctly parsed as UTC rather than local time.
 */
export function parseDateUTC(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date()
  let str = String(dateStr).trim()
  if (!str) return new Date()

  // Match SQLite 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DD HH:MM:SS.sss'
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T') + 'Z'
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str) && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str = str + 'Z'
  }

  const d = new Date(str)
  return isNaN(d.getTime()) ? new Date() : d
}

/**
 * Returns human-friendly relative time (e.g. "Just now", "2m ago", "1h ago", "3d ago")
 * Handles clock skew where diffMs is small or slightly negative.
 */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  try {
    if (!dateStr) return ''
    const parsed = parseDateUTC(dateStr)
    const diffMs = Date.now() - parsed.getTime()
    if (isNaN(diffMs)) return ''
    // Allow up to 45 seconds of leeway / clock skew for "Just now"
    if (diffMs < 45000) return 'Just now'
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    return parsed.toLocaleDateString()
  } catch {
    return ''
  }
}
