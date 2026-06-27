// Read prompt files from /prompts folder. Lets the AI in chat read the user's
// prompt library when planning visual generation or script writing.
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const PROMPTS_DIR = path.join(process.cwd(), 'prompts')

async function listMarkdownFiles(dir: string, base = ''): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const relative = base ? path.posix.join(base, entry.name) : entry.name
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(full, relative))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relative)
    }
  }
  return files.sort((a, b) => a.localeCompare(b))
}

export async function GET() {
  try {
    const entries = await fs.readdir(PROMPTS_DIR, { withFileTypes: true })
    const folders = entries.filter(e => e.isDirectory()).map(e => e.name)
    const tree: Record<string, string[]> = {}
    for (const folder of folders) {
      tree[folder] = await listMarkdownFiles(path.join(PROMPTS_DIR, folder))
    }
    return NextResponse.json({ folders: tree })
  } catch {
    return NextResponse.json({ folders: {}, error: 'prompts/ folder not found' })
  }
}
