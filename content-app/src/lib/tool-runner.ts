// Shared helper for spawning Node.js tool scripts.
// Used by all /api/ai/browse/* routes to run tools/browser/* and tools/dreamina/* scripts.

import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { existsSync } from 'fs'

const exec = promisify(execFile)

export interface ToolResult {
  ok: boolean
  stdout: string
  stderr: string
  parsed?: unknown
  error?: string
  timedOut?: boolean
}

export const TOOLS_DIR = path.join(process.cwd(), 'tools')
export const QA_DIR = path.join(process.cwd(), 'qa')

/**
 * Spawn a Node.js tool script and return its output.
 * @param scriptPath - path relative to tools/ (e.g. "browser/browser_task.js")
 * @param args - CLI args to pass
 * @param timeoutMs - default 90s (browser tasks are slow)
 */
export async function runTool(
  scriptPath: string,
  args: string[] = [],
  timeoutMs = 90_000,
): Promise<ToolResult> {
  const fullPath = path.join(TOOLS_DIR, scriptPath)

  if (!existsSync(fullPath)) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      error: `Tool not found: tools/${scriptPath}. Make sure the tools/ folder is in the project root.`,
    }
  }

  try {
    const { stdout, stderr } = await exec('node', [fullPath, ...args], {
      cwd: process.cwd(),
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env },
    })

    // Try to parse stdout as JSON (most tools output JSON)
    let parsed: unknown = undefined
    try {
      parsed = JSON.parse(stdout)
    } catch {
      // Not JSON — that's fine, return raw stdout
    }

    return { ok: true, stdout, stderr, parsed }
  } catch (err) {
    const e = err as { stderr?: string; message: string; killed?: boolean; code?: number; stdout?: string }
    return {
      ok: false,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      error: e.killed
        ? `Tool timed out after ${timeoutMs / 1000}s`
        : `Tool failed: ${e.message}`,
      timedOut: e.killed,
    }
  }
}

/**
 * Check if Edge CDP is reachable.
 */
export async function checkEdgeCdp(): Promise<{ ok: boolean; cdp: string; browser?: string; message: string }> {
  const cdpUrl = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222'
  try {
    const res = await fetch(`${cdpUrl}/json/version`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json() as { Browser?: string }
      return {
        ok: true,
        cdp: cdpUrl,
        browser: data.Browser,
        message: 'Edge CDP is reachable. Browser automation is ready.',
      }
    }
    return {
      ok: false,
      cdp: cdpUrl,
      message: 'Edge CDP responded but not OK. Run: node tools/browser/edge_keepopen.js',
    }
  } catch {
    return {
      ok: false,
      cdp: cdpUrl,
      message: 'Edge CDP not reachable. Run: node tools/browser/edge_keepopen.js (in a separate terminal, leave it running)',
    }
  }
}
