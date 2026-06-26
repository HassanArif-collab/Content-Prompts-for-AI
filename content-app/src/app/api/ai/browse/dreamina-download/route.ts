// Dreamina download — spawns dreamina_download_latest.js
// Input: { count?, promptFragment? }
// Output: { status, saved: [{ filePath, mime, ... }], jsonPath }

import { NextRequest, NextResponse } from 'next/server'
import { runTool, checkEdgeCdp } from '@/lib/tool-runner'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    count?: number         // how many images to download (1-8, default 1)
    promptFragment?: string // filter by prompt text
  }

  // Check Edge CDP first
  const cdp = await checkEdgeCdp()
  if (!cdp.ok) {
    return NextResponse.json({
      ok: false,
      error: 'Edge CDP not reachable',
      cdp,
      nextStep: 'Run: node tools/browser/edge_keepopen.js (in a separate terminal, leave it running)',
    }, { status: 503 })
  }

  // Build args
  const args: string[] = []
  if (body.count) args.push('--count', String(Math.min(Math.max(body.count, 1), 8)))
  if (body.promptFragment) args.push('--prompt-fragment', body.promptFragment)

  // Run dreamina_download_latest.js (60s timeout)
  const result = await runTool('dreamina/dreamina_download_latest.js', args, 60_000)

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      error: result.error,
      stderr: result.stderr?.slice(0, 2000),
      timedOut: result.timedOut,
    }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    result: result.parsed,
    raw: result.stdout,
  })
}
