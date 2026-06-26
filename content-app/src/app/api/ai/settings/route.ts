import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings, type AiSettings } from '@/lib/ai'

export async function GET() {
  return NextResponse.json(await getSettings())
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<AiSettings>
  const current = await getSettings()
  const next: AiSettings = {
    provider: body.provider === 'ollama' ? 'ollama' : 'zai',
    ollamaUrl: body.ollamaUrl ?? current.ollamaUrl,
    ollamaModel: body.ollamaModel ?? current.ollamaModel,
    browsingEnabled: body.browsingEnabled ?? current.browsingEnabled,
  }
  await saveSettings(next)
  return NextResponse.json(next)
}
