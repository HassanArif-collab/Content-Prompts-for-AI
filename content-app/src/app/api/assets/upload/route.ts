// Lean asset flow: accept an uploaded image/video and save it to the
// tools/downloads dir, which /api/assets/[...path] already serves. Returns the
// filename + kind so the shot can link to it. Additive, scoped to one dir.

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'tools', 'downloads')
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
const VIDEO_EXT = ['.mp4', '.webm']

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'no file' }, { status: 400 })
  }
  const ext = path.extname(file.name).toLowerCase()
  const kind = VIDEO_EXT.includes(ext) ? 'video' : IMAGE_EXT.includes(ext) ? 'image' : null
  if (!kind) {
    return NextResponse.json({ ok: false, error: 'unsupported file type' }, { status: 400 })
  }
  await mkdir(UPLOAD_DIR, { recursive: true })
  const safe = `${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`
  await writeFile(path.join(UPLOAD_DIR, safe), Buffer.from(await file.arrayBuffer()))
  return NextResponse.json({ ok: true, path: safe, kind })
}
