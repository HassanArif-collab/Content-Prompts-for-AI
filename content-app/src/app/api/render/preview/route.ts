// Render preview — takes HTML/CSS/JS code, renders it in a headless browser, returns a PNG screenshot.
// This is the "100% guaranteed working" way to preview generated compositions.
//
// Input: { html: string, width?: number, height?: number }
// Output: { image: <base64 PNG> }
//
// The HTML must be a complete document (or fragment that we wrap).
// GSAP/TimelineMax are auto-loaded if the code references them.

import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright'
import { renderRemotionPreview } from '@/lib/remotion-renderer'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    html?: string
    remotionCode?: string
    code?: string
    width?: number
    height?: number
    fps?: number
    durationInFrames?: number
    frame?: number
    props?: Record<string, unknown>
    waitForAnimation?: number  // ms to wait before screenshot (default 3000)
  }

  const remotionCode = body.remotionCode ?? body.code
  if (remotionCode) {
    try {
      const preview = await renderRemotionPreview({
        code: remotionCode,
        width: body.width,
        height: body.height,
        fps: body.fps,
        durationInFrames: body.durationInFrames,
        frame: body.frame,
        props: body.props,
      })
      return NextResponse.json({ ok: true, engine: 'remotion', ...preview })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'remotion render failed'
      return NextResponse.json({ ok: false, engine: 'remotion', error: message }, { status: 500 })
    }
  }

  if (!body.html) {
    return NextResponse.json({ error: 'html or remotionCode required' }, { status: 400 })
  }

  const width = body.width ?? 1280
  const height = body.height ?? 720
  const waitMs = body.waitForAnimation ?? 3000

  let browser
  try {
    // Launch headless Chromium (Playwright's bundled one, not Edge)
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,  // higher quality screenshot
    })
    const page = await context.newPage()

    // Wrap the HTML if it's a fragment
    let fullHtml = body.html
    if (!fullHtml.includes('<html') && !fullHtml.includes('<!DOCTYPE')) {
      fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: #000; }
  * { box-sizing: border-box; }
</style>
<!-- Auto-load GSAP if the code uses it -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/TimelineMax.min.js"></script>
</head>
<body>
${fullHtml}
</body>
</html>`
    } else {
      // It's a full document — inject GSAP scripts if not present
      if (!fullHtml.includes('gsap')) {
        fullHtml = fullHtml.replace('</head>',
          '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>' +
          '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/TimelineMax.min.js"></script>' +
          '</head>'
        )
      }
    }

    // Set the HTML content
    await page.setContent(fullHtml, { waitUntil: 'networkidle', timeout: 30_000 })

    // Wait for animations to play
    await page.waitForTimeout(waitMs)

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      clip: { x: 0, y: 0, width, height },
    })

    const base64 = screenshot.toString('base64')

    await browser.close()

    return NextResponse.json({
      ok: true,
      image: base64,
      width,
      height,
    })
  } catch (err) {
    if (browser) await browser.close().catch(() => {})
    const message = err instanceof Error ? err.message : 'render failed'
    return NextResponse.json({
      ok: false,
      error: message,
    }, { status: 500 })
  }
}

// Health check
export async function GET() {
  try {
    const browser = await chromium.launch({ headless: true })
    await browser.close()
    return NextResponse.json({ ok: true, message: 'Playwright is available for rendering' })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: 'Playwright not available. Run: npx playwright install chromium',
      detail: err instanceof Error ? err.message : 'unknown',
    }, { status: 503 })
  }
}
