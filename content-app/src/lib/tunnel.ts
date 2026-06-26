// Cloudflare tunnel manager — spawns `cloudflared tunnel --url http://localhost:3000`
// and parses the public URL from stdout. Single process, kept in module scope.

import { spawn, type ChildProcess } from 'child_process'

let tunnelProc: ChildProcess | null = null
let publicUrl: string | null = null
let startedAt: Date | null = null
let lastError: string | null = null

export function getTunnelStatus() {
  return {
    running: !!tunnelProc && !tunnelProc.killed,
    url: publicUrl,
    startedAt: startedAt?.toISOString() ?? null,
    error: lastError,
  }
}

export function startTunnel(localPort = 3000): Promise<{ url: string } | { error: string }> {
  return new Promise((resolve) => {
    if (tunnelProc && !tunnelProc.killed) {
      if (publicUrl) return resolve({ url: publicUrl })
      return resolve({ error: 'tunnel already starting…' })
    }

    lastError = null
    publicUrl = null

    try {
      tunnelProc = spawn('cloudflared', [
        'tunnel',
        '--url', `http://localhost:${localPort}`,
        // No metrics port — keep it simple
      ], { stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'spawn failed'
      lastError = `cloudflared not found: ${msg}. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/`
      return resolve({ error: lastError })
    }

    startedAt = new Date()
    let resolved = false
    let stdoutBuffer = ''
    let stderrBuffer = ''

    // cloudflared prints the URL to stderr typically
    tunnelProc.stderr?.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString()
      checkForUrl(stderrBuffer)
    })
    tunnelProc.stdout?.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString()
      checkForUrl(stdoutBuffer)
    })

    function checkForUrl(text: string) {
      if (resolved) return
      // Match https://random-words-1234.trycloudflare.com
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
      if (match) {
        publicUrl = match[0]
        resolved = true
        resolve({ url: publicUrl })
      }
    }

    tunnelProc.on('error', (err) => {
      lastError = `Failed to start cloudflared: ${err.message}. Is it installed and on PATH?`
      if (!resolved) {
        resolved = true
        resolve({ error: lastError })
      }
    })

    tunnelProc.on('exit', (code) => {
      if (!resolved) {
        resolved = true
        if (code !== 0 && !publicUrl) {
          lastError = `cloudflared exited with code ${code} before producing a URL. Check installation.`
          resolve({ error: lastError })
        } else {
          resolve({ error: 'tunnel exited unexpectedly' })
        }
      }
      tunnelProc = null
      publicUrl = null
      startedAt = null
    })

    // Timeout: if no URL after 15s, return but keep trying
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        if (publicUrl) {
          resolve({ url: publicUrl })
        } else {
          resolve({ error: 'Tunnel started but no URL detected yet. Cloudflared may still be connecting.' })
        }
      }
    }, 15_000)
  })
}

export function stopTunnel(): boolean {
  if (!tunnelProc || tunnelProc.killed) {
    tunnelProc = null
    publicUrl = null
    startedAt = null
    return false
  }
  try {
    tunnelProc.kill('SIGTERM')
    // Give it 2s, then force kill
    setTimeout(() => {
      if (tunnelProc && !tunnelProc.killed) {
        tunnelProc.kill('SIGKILL')
      }
    }, 2000)
  } catch {
    // ignore
  }
  tunnelProc = null
  publicUrl = null
  startedAt = null
  return true
}
