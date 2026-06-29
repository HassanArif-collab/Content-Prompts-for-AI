// Screenshot a URL in headless Chromium and return a PNG (base64).
// Used by the Sources sidebar to show a visual "browser preview" of a source.
// Additive + read-only (navigates and captures; never writes).
//
// ponytail: basic SSRF guard (http/https only, block localhost/private ranges).
// This is a single-user local app, so the guard is a floor, not a fortress —
// tighten with an allowlist if this ever runs multi-tenant.

import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright'

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (/^(127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.)/.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  if (h === '::1' || h === '[::1]') return true
  return false
}

export async function POST(req: NextRequest) {
  const { url } = (await req.json()) as { url?: string }
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ ok: false, error: 'url required' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid url' }, { status: 400 })
  }
  if (!/^https?:$/.test(parsed.protocol) || isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ ok: false, error: 'URL not allowed' }, { status: 400 })
  }

  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await context.newPage()
    await page.goto(parsed.toString(), { waitUntil: 'networkidle', timeout: 20_000 })
    await page.waitForTimeout(800)
    const shot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1280, height: 800 } })
    await browser.close()
    return NextResponse.json({ ok: true, image: shot.toString('base64'), width: 1280, height: 800 })
  } catch (err) {
    if (browser) await browser.close().catch(() => {})
    const message = err instanceof Error ? err.message : 'screenshot failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
