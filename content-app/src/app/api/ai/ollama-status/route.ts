// Quick ping to Ollama at a given URL. Returns { ok, version, models? } or { ok: false, error }.
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json() as { url?: string }
  if (!url) return NextResponse.json({ ok: false, error: 'url required' }, { status: 400 })
  try {
    const base = url.replace(/\/$/, '')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(`${base}/api/tags`, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `HTTP ${res.status}` })
    }
    const data = await res.json() as { models?: Array<{ name: string }> }
    return NextResponse.json({
      ok: true,
      models: (data.models ?? []).map(m => m.name),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'connection failed'
    return NextResponse.json({ ok: false, error: msg })
  }
}
