// Import a folder of generated images/videos into tools/downloads (which
// /api/assets/[...path] serves). Files are named sequentially+descriptively
// (e.g. 01-white-house.png) — the leading number is the shot order (1-based).
// Shallow read of the given dir only; copies each media file with a timestamp
// prefix to avoid collisions. Additive, scoped to one dir, no execution.

import { NextRequest, NextResponse } from 'next/server'
import { readdir, copyFile, mkdir, stat } from 'fs/promises'
import path from 'path'

const DOWNLOAD_DIR = path.join(process.cwd(), 'tools', 'downloads')
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
const VIDEO_EXT = ['.mp4', '.webm']

export async function POST(req: NextRequest) {
  const { folderPath } = await req.json().catch(() => ({}))
  if (typeof folderPath !== 'string' || !folderPath.trim()) {
    return NextResponse.json({ ok: false, error: 'folderPath required' }, { status: 400 })
  }

  const dir = path.resolve(folderPath)
  let dirStat
  try {
    dirStat = await stat(dir)
  } catch {
    return NextResponse.json({ ok: false, error: 'folder not found' }, { status: 400 })
  }
  if (!dirStat.isDirectory()) {
    return NextResponse.json({ ok: false, error: 'not a directory' }, { status: 400 })
  }

  await mkdir(DOWNLOAD_DIR, { recursive: true })

  const entries = await readdir(dir, { withFileTypes: true })
  const files: { original: string; savedPath: string; kind: 'image' | 'video'; shotIndex: number | null }[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue // shallow: skip subdirs, symlinks, etc.
    const ext = path.extname(entry.name).toLowerCase()
    const kind = VIDEO_EXT.includes(ext) ? 'video' : IMAGE_EXT.includes(ext) ? 'image' : null
    if (!kind) continue

    const safe = `${Date.now()}-${entry.name.replace(/[^a-z0-9._-]/gi, '_')}`
    await copyFile(path.join(dir, entry.name), path.join(DOWNLOAD_DIR, safe))

    const m = entry.name.match(/^(\d+)/)
    files.push({ original: entry.name, savedPath: safe, kind, shotIndex: m ? parseInt(m[1], 10) : null })
  }

  return NextResponse.json({ ok: true, files })
}
