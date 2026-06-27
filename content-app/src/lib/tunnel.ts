// Cloudflare tunnel manager — spawns `cloudflared tunnel --url http://localhost:3000`
// and parses the public URL from stdout. State is process-global so Next.js route
// bundles and development reloads observe the same child process.

import { spawn, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'

interface TunnelState {
  proc: ChildProcess | null
  publicUrl: string | null
  startedAt: Date | null
  lastError: string | null
}

const tunnelGlobal = globalThis as typeof globalThis & { documentaryTunnelState?: TunnelState }
const state = tunnelGlobal.documentaryTunnelState ??= {
  proc: null,
  publicUrl: null,
  startedAt: null,
  lastError: null,
}

export function getTunnelStatus() {
  return {
    running: !!state.proc && state.proc.exitCode === null && !state.proc.killed,
    url: state.publicUrl,
    startedAt: state.startedAt?.toISOString() ?? null,
    error: state.lastError,
  }
}

export function startTunnel(localPort = 3000): Promise<{ url: string } | { error: string }> {
  return new Promise((resolve) => {
    if (state.proc && state.proc.exitCode === null && !state.proc.killed) {
      if (state.publicUrl) return resolve({ url: state.publicUrl })
      return resolve({ error: 'tunnel already starting…' })
    }

    state.lastError = null
    state.publicUrl = null

    try {
      state.proc = spawn(resolveCloudflaredCommand(), [
        'tunnel',
        '--url', `http://localhost:${localPort}`,
        // No metrics port — keep it simple
      ], { stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'spawn failed'
      state.lastError = `cloudflared not found: ${msg}. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/`
      return resolve({ error: state.lastError })
    }

    const proc = state.proc
    state.startedAt = new Date()
    let resolved = false
    let stdoutBuffer = ''
    let stderrBuffer = ''

    // cloudflared prints the URL to stderr typically
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString()
      checkForUrl(stderrBuffer)
    })
    proc.stdout?.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString()
      checkForUrl(stdoutBuffer)
    })

    function checkForUrl(text: string) {
      if (resolved) return
      // Match https://random-words-1234.trycloudflare.com
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
      if (match) {
        state.publicUrl = match[0]
        resolved = true
        resolve({ url: state.publicUrl })
      }
    }

    proc.on('error', (err) => {
      state.lastError = `Failed to start cloudflared: ${err.message}. Is it installed and on PATH?`
      if (state.proc === proc) state.proc = null
      state.startedAt = null
      if (!resolved) {
        resolved = true
        resolve({ error: state.lastError })
      }
    })

    proc.on('exit', (code) => {
      if (!resolved) {
        resolved = true
        if (code !== 0 && !state.publicUrl) {
          state.lastError = `cloudflared exited with code ${code} before producing a URL. Check installation.`
          resolve({ error: state.lastError })
        } else {
          resolve({ error: 'tunnel exited unexpectedly' })
        }
      }
      if (state.proc === proc) {
        state.proc = null
        state.publicUrl = null
        state.startedAt = null
      }
    })

    // Timeout: stop cleanly so status polling cannot remain stuck on "starting".
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        if (state.publicUrl) {
          resolve({ url: state.publicUrl })
        } else {
          state.lastError = 'Cloudflare tunnel timed out before producing a public URL.'
          if (state.proc === proc) state.proc = null
          state.startedAt = null
          if (proc.exitCode === null && !proc.killed) {
            proc.kill('SIGTERM')
          }
          resolve({ error: state.lastError })
        }
      }
    }, 15_000)
  })
}

function resolveCloudflaredCommand(): string {
  const candidates = [
    process.env.CLOUDFLARED_PATH,
    process.env['ProgramFiles(x86)'] && `${process.env['ProgramFiles(x86)']}\\cloudflared\\cloudflared.exe`,
    process.env.ProgramFiles && `${process.env.ProgramFiles}\\cloudflared\\cloudflared.exe`,
  ]

  return candidates.find((candidate): candidate is string => !!candidate && existsSync(candidate)) ?? 'cloudflared'
}

export function stopTunnel(): boolean {
  if (!state.proc || state.proc.exitCode !== null || state.proc.killed) {
    state.proc = null
    state.publicUrl = null
    state.startedAt = null
    return false
  }
  const proc = state.proc
  try {
    proc.kill('SIGTERM')
    // Give it 2s, then force kill
    setTimeout(() => {
      if (proc.exitCode === null && !proc.killed) {
        proc.kill('SIGKILL')
      }
    }, 2000)
  } catch {
    // ignore
  }
  state.proc = null
  state.publicUrl = null
  state.startedAt = null
  return true
}
