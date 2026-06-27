import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const PROMPTS_DIR = path.join(process.cwd(), 'prompts')

function safeFolder(s: string): boolean {
  return /^[a-z0-9-]+$/i.test(s) && !s.includes('..')
}

function safeSegment(s: string): boolean {
  return Boolean(s) && !s.includes('..') && !/[\\/:*?"<>|]/.test(s)
}

async function findByBasename(folderDir: string, requested: string): Promise<string | null> {
  const target = requested.endsWith('.md') ? requested : `${requested}.md`
  async function walk(dir: string): Promise<string | null> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const found = await walk(full)
        if (found) return found
      } else if (entry.isFile() && entry.name === target) {
        return full
      }
    }
    return null
  }
  return walk(folderDir)
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ folder: string; path: string[] }> }) {
  const { folder, path: pathParts } = await ctx.params
  if (!safeFolder(folder) || !Array.isArray(pathParts) || pathParts.some(part => !safeSegment(part))) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  const folderDir = path.join(PROMPTS_DIR, folder)
  const requested = pathParts.join('/')
  const withExtension = requested.endsWith('.md') ? requested : `${requested}.md`
  const directPath = path.join(folderDir, ...withExtension.split('/'))

  try {
    const content = await fs.readFile(directPath, 'utf8')
    return NextResponse.json({ folder, file: withExtension, content })
  } catch {
    if (pathParts.length === 1) {
      const found = await findByBasename(folderDir, pathParts[0])
      if (found) {
        const content = await fs.readFile(found, 'utf8')
        const relative = path.relative(folderDir, found).split(path.sep).join('/')
        return NextResponse.json({ folder, file: relative, content })
      }
    }
    return NextResponse.json({ error: 'file not found' }, { status: 404 })
  }
}
