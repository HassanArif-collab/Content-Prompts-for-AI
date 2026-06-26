// Dreamina image generation — spawns dreamina_image_probe.js
// Input: { prompt, generate?, agent?, allowGptBatch?, closeTab? }
// Output: { status, generated, shots, jsonPath }

import { NextRequest, NextResponse } from 'next/server'
import { runTool, checkEdgeCdp } from '@/lib/tool-runner'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    prompt: string
    generate?: boolean      // if true, actually clicks Generate (requires allowGptBatch for GPT Image 2)
    agent?: boolean         // if true, uses AI Agent mode (NOT GPT Image 2)
    allowGptBatch?: boolean // if true, allows the 4-image GPT Image 2 batch spend
    closeTab?: boolean      // if true, closes the tab after
  }

  if (!body.prompt) {
    return NextResponse.json({ error: 'prompt required' }, { status: 400 })
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
  if (body.generate) args.push('--generate')
  if (body.agent) args.push('--agent')
  if (body.allowGptBatch) args.push('--allow-gpt-batch')
  if (body.closeTab) args.push('--close-tab')
  args.push('--prompt', body.prompt)

  // Run dreamina_image_probe.js (120s timeout — page loads + waits are slow)
  const result = await runTool('dreamina/dreamina_image_probe.js', args, 120_000)

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
