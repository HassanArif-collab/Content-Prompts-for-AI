// Documentary-specific utility functions

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

// Returns minutes (float)
export function estimateRuntimeMinutes(words: number, wpm = 150): number {
  if (!words) return 0
  return words / wpm
}

export function formatRuntime(minutes: number): string {
  if (minutes <= 0) return '0:00'
  const totalSeconds = Math.round(minutes * 60)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDuration(seconds: number): string {
  return formatRuntime(seconds / 60)
}

const STATUS_COLORS: Record<string, string> = {
  research: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  scripting: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  production: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  editing: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  published: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
}

export function statusBadgeClass(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground border-border'
}

const COVER_COLORS: Record<string, string> = {
  amber: 'from-amber-500/20 via-amber-600/10 to-transparent border-amber-500/30',
  emerald: 'from-emerald-500/20 via-emerald-600/10 to-transparent border-emerald-500/30',
  rose: 'from-rose-500/20 via-rose-600/10 to-transparent border-rose-500/30',
  violet: 'from-violet-500/20 via-violet-600/10 to-transparent border-violet-500/30',
  sky: 'from-sky-500/20 via-sky-600/10 to-transparent border-sky-500/30',
  orange: 'from-orange-500/20 via-orange-600/10 to-transparent border-orange-500/30',
}

export function coverGradientClass(color: string): string {
  return COVER_COLORS[color] ?? COVER_COLORS.amber
}

const COVER_DOTS: Record<string, string> = {
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  sky: 'bg-sky-500',
  orange: 'bg-orange-500',
}

export function coverDotClass(color: string): string {
  return COVER_DOTS[color] ?? COVER_DOTS.amber
}

export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
