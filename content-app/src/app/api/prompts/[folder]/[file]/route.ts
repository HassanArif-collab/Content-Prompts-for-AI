import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const PROMPTS_DIR = path.join(process.cwd(), 'prompts')

// Validate folder/file names to prevent path traversal
function safeName(s: string): boolean {
  return /^[a-z0-9-]+$/i.test(s) && !s.includes('..')
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ folder: string; file: string }> }) {
  const { folder, file } = await ctx.params
  if (!safeName(folder) || !safeName(file.replace(/\.md$/, ''))) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }
  const filePath = path.join(PROMPTS_DIR, folder, file.endsWith('.md') ? file : `${file}.md`)
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return NextResponse.json({ folder, file, content })
  } catch {
    return NextResponse.json({ error: 'file not found' }, { status: 404 })
  }
}
