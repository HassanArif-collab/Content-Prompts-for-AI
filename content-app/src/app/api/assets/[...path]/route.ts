// Read-only asset serving route for AI-generated video/image files.
// Streams files from the tools download directory to the browser.
// Path-traversal guarded, read-only (no writes, no deletes).

import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// Allowed base directories for asset serving
const ALLOWED_DIRS = [
  path.join(process.cwd(), 'qa', 'browser_downloads'),
  path.join(process.cwd(), 'qa', 'browser_ui_maps'),
  path.join(process.cwd(), 'tools', 'downloads'),
  path.join(process.cwd(), 'public'),
]

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params
  const relativePath = segments.join('/')

  // Prevent path traversal
  if (relativePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  // Find which allowed dir contains the file
  let resolvedPath: string | null = null
  for (const dir of ALLOWED_DIRS) {
    const candidate = path.join(dir, relativePath)
    // Verify the resolved path is still within the allowed dir
    const resolved = path.resolve(candidate)
    if (resolved.startsWith(path.resolve(dir)) && existsSync(resolved)) {
      resolvedPath = resolved
      break
    }
  }

  if (!resolvedPath) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  try {
    const data = await readFile(resolvedPath)
    const ext = path.extname(resolvedPath).toLowerCase()
    const mime = MIME[ext] || 'application/octet-stream'

    return new NextResponse(data, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Could not read file' }, { status: 500 })
  }
}
