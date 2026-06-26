// AI browsing tool — shells out to `agent-browser` (Playwright-based) so the AI
// can drive a real browser. Used when readUrl() fails (e.g. JS-heavy sites,
// login walls the user is already past) or when the AI needs to interact.
//
// Ponytail: one endpoint, one switch on `action`. No abstraction.
//
// Actions:
//   open     { url }                              -> { ok, title, url }
//   snapshot { }                                  -> { ok, elements: [{ref, role, name, text}] }
//   click    { ref }                              -> { ok }
//   fill     { ref, value }                       -> { ok }
//   text     { selector? }                        -> { ok, text }
//   screenshot { full? }                          -> { ok, path }
//   close    { }                                  -> { ok }
//   run      { command, args[] }                  -> { ok, stdout, stderr }
//     (low-level escape hatch — runs any agent-browser subcommand)

import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const exec = promisify(execFile)

const AB = 'agent-browser'
const TIMEOUT = 60_000 // 60s — sites can be slow

async function run(args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await exec(AB, args, { timeout: TIMEOUT, maxBuffer: 10 * 1024 * 1024 })
    return { stdout, stderr }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message: string; killed?: boolean }
    if (e.killed) throw new Error('agent-browser timed out')
    // agent-browser writes most output to stdout even on errors
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? e.message }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    action: 'open' | 'snapshot' | 'click' | 'fill' | 'text' | 'screenshot' | 'close' | 'run'
    url?: string
    ref?: string
    value?: string
    selector?: string
    full?: boolean
    command?: string
    args?: string[]
  }

  if (!body.action) {
    return NextResponse.json({ ok: false, error: 'action required' }, { status: 400 })
  }

  let result: { stdout: string; stderr: string } = { stdout: '', stderr: '' }

  switch (body.action) {
    case 'open': {
      if (!body.url) return NextResponse.json({ ok: false, error: 'url required' }, { status: 400 })
      result = await run(['open', body.url])
      const title = (result.stdout.match(/✓ (.+)$/m) ?? [])[1] ?? ''
      return NextResponse.json({ ok: true, title: title.trim(), url: body.url, raw: result.stdout })
    }
    case 'snapshot': {
      result = await run(['snapshot', '-i'])
      // Parse the interactive elements output
      // Format: "- <role> [ref=eN]" or "- <role> \"name\" [ref=eN]"
      const elements: Array<{ ref: string; role: string; name?: string; text?: string }> = []
      for (const line of result.stdout.split('\n')) {
        const m = line.match(/^\s*- (\S+)(?:\s+"([^"]+)")?\s*(?:\[ref=(\S+)\])?/)
        if (m) {
          elements.push({ role: m[1], name: m[2] ?? undefined, ref: m[3] ?? '' })
        }
      }
      return NextResponse.json({ ok: true, elements, raw: result.stdout })
    }
    case 'click': {
      if (!body.ref) return NextResponse.json({ ok: false, error: 'ref required' }, { status: 400 })
      result = await run(['click', body.ref])
      return NextResponse.json({ ok: !result.stderr.toLowerCase().includes('error'), raw: result.stdout })
    }
    case 'fill': {
      if (!body.ref || body.value === undefined) {
        return NextResponse.json({ ok: false, error: 'ref and value required' }, { status: 400 })
      }
      result = await run(['fill', body.ref, body.value])
      return NextResponse.json({ ok: !result.stderr.toLowerCase().includes('error'), raw: result.stdout })
    }
    case 'text': {
      const args = ['get', 'text']
      if (body.selector) { args.push(body.selector) }
      // Ponytail: get text of the whole page by default — most common case
      else { args.push('body') }
      result = await run(args)
      return NextResponse.json({ ok: true, text: result.stdout, raw: result.stdout })
    }
    case 'screenshot': {
      const args = ['screenshot']
      if (body.full) args.push('--full')
      result = await run(args)
      // agent-browser prints the path or "✓ Screenshot saved to: ..."
      const pathMatch = result.stdout.match(/saved to:\s*(\S+)/)
      return NextResponse.json({ ok: true, path: pathMatch?.[1] ?? '', raw: result.stdout })
    }
    case 'close': {
      result = await run(['close'])
      return NextResponse.json({ ok: true })
    }
    case 'run': {
      if (!body.command) return NextResponse.json({ ok: false, error: 'command required' }, { status: 400 })
      result = await run([body.command, ...(body.args ?? [])])
      return NextResponse.json({ ok: true, stdout: result.stdout, stderr: result.stderr })
    }
    default:
      return NextResponse.json({ ok: false, error: `unknown action: ${body.action}` }, { status: 400 })
  }
}
