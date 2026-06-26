// Read prompt files from /prompts folder. Lets the AI in chat read the user's
// prompt library when planning visual generation or script writing.
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const PROMPTS_DIR = path.join(process.cwd(), 'prompts')

export async function GET() {
  try {
    const entries = await fs.readdir(PROMPTS_DIR, { withFileTypes: true })
    const folders = entries.filter(e => e.isDirectory()).map(e => e.name)
    const tree: Record<string, string[]> = {}
    for (const folder of folders) {
      const files = await fs.readdir(path.join(PROMPTS_DIR, folder))
      tree[folder] = files.filter(f => f.endsWith('.md'))
    }
    return NextResponse.json({ folders: tree })
  } catch {
    return NextResponse.json({ folders: {}, error: 'prompts/ folder not found' })
  }
}
