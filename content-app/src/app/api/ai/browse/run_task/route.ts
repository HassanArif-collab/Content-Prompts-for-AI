// Main browser task orchestrator — routes to the right tool based on capability.
// This is the single entry point the AI uses for browser automation.
//
// Capabilities:
//   dreamina.still_image     → /api/ai/browse/dreamina-image
//   dreamina.multiframes     → tools/browser/browser_task.js (observe/dry-run until video UI is mapped)
//   dreamina.download        → /api/ai/browse/dreamina-download
//   browser.source_capture   → tools/browser/browser_task.js (observe only)
//   flow.*                   → tools/browser/browser_task.js (observe only, no Flow tools yet)
//   route                    → /api/ai/browse/route-task (just routes, doesn't execute)

import { NextRequest, NextResponse } from 'next/server'
import { runTool, checkEdgeCdp } from '@/lib/tool-runner'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    capability: string
    url?: string
    prompt?: string
    inputs?: Record<string, unknown>
    allow_credit_spend?: boolean
    count?: number
    promptFragment?: string
  }

  if (!body.capability) {
    return NextResponse.json({ error: 'capability required' }, { status: 400 })
  }

  const cap = body.capability

  // Route based on capability
  if (cap === 'dreamina.still_image') {
    return handleDreaminaImage(body)
  }

  if (cap === 'dreamina.download') {
    return handleDreaminaDownload(body)
  }

  // Default: use browser_task.js (observe only)
  return handleBrowserTask(body)
}

async function handleDreaminaImage(body: {
  prompt?: string
  inputs?: Record<string, unknown>
  allow_credit_spend?: boolean
  capability: string
}) {
  const prompt = getStringInput(body, 'prompt')

  if (!prompt) {
    return NextResponse.json({
      ok: false,
      error: 'prompt required for dreamina.still_image',
    }, { status: 400 })
  }

  const cdp = await checkEdgeCdp()
  if (!cdp.ok) {
    return NextResponse.json({
      ok: false,
      error: 'Edge CDP not reachable',
      cdp,
      nextStep: 'Run: node tools/browser/edge_keepopen.js (in a separate terminal, leave it running)',
    }, { status: 503 })
  }

  const args: string[] = []
  if (body.allow_credit_spend) {
    args.push('--generate', '--allow-gpt-batch')
  }
  args.push('--prompt', prompt)

  const result = await runTool('dreamina/dreamina_image_probe.js', args, 120_000)

  return NextResponse.json({
    ok: result.ok,
    capability: body.capability,
    result: result.parsed,
    error: result.error,
    stderr: result.stderr?.slice(0, 2000),
    timedOut: result.timedOut,
  }, { status: result.ok ? 200 : 500 })
}

function getStringInput(body: {
  prompt?: string
  inputs?: Record<string, unknown>
}, key: string) {
  if (typeof body[key as 'prompt'] === 'string') return body[key as 'prompt']
  const value = body.inputs?.[key]
  return typeof value === 'string' ? value : undefined
}

async function handleDreaminaDownload(body: {
  count?: number
  promptFragment?: string
  capability: string
}) {
  const cdp = await checkEdgeCdp()
  if (!cdp.ok) {
    return NextResponse.json({
      ok: false,
      error: 'Edge CDP not reachable',
      cdp,
      nextStep: 'Run: node tools/browser/edge_keepopen.js',
    }, { status: 503 })
  }

  const args: string[] = []
  if (body.count) args.push('--count', String(Math.min(Math.max(body.count, 1), 8)))
  if (body.promptFragment) args.push('--prompt-fragment', body.promptFragment)

  const result = await runTool('dreamina/dreamina_download_latest.js', args, 60_000)

  return NextResponse.json({
    ok: result.ok,
    capability: body.capability,
    result: result.parsed,
    error: result.error,
    stderr: result.stderr?.slice(0, 2000),
    timedOut: result.timedOut,
  }, { status: result.ok ? 200 : 500 })
}

async function handleBrowserTask(body: {
  capability: string
  url?: string
  inputs?: Record<string, unknown>
  allow_credit_spend?: boolean
}) {
  // For browser.source_capture, flow.*, etc. — observe only
  const { writeFile, mkdir } = await import('fs/promises')
  const path = await import('path')
  const { QA_DIR } = await import('@/lib/tool-runner')

  const task = {
    capability: body.capability,
    url: body.url,
    inputs: body.inputs ?? {},
    allow_credit_spend: Boolean(body.allow_credit_spend),
  }

  await mkdir(QA_DIR, { recursive: true })
  const taskPath = path.join(QA_DIR, `task-${Date.now()}.json`)
  await writeFile(taskPath, JSON.stringify(task, null, 2), 'utf8')

  const result = await runTool('browser/browser_task.js', [taskPath], 90_000)

  return NextResponse.json({
    ok: result.ok,
    capability: body.capability,
    result: result.parsed,
    error: result.error,
    stderr: result.stderr?.slice(0, 2000),
    timedOut: result.timedOut,
    taskPath,
  }, { status: result.ok ? 200 : 500 })
}

// GET: Edge CDP health check
export async function GET() {
  const status = await checkEdgeCdp()
  return NextResponse.json(status)
}
