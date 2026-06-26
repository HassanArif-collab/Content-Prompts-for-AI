import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { streamChat, buildProjectContext, getSettings } from '@/lib/ai'

// Streaming chat with project context.
// Body: { projectId, messages: [{role, content}], thinking?: boolean }
// Provider is chosen from .ai-settings.json (zai default, ollama optional).

export async function POST(req: NextRequest) {
  const body = await req.json()
  const projectId: string | undefined = body.projectId
  const incoming: Array<{ role: 'user' | 'assistant'; content: string }> = body.messages ?? []
  const thinking: boolean = body.thinking ?? false

  if (incoming.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
  }

  const settings = await getSettings()

  // Load project for context
  let context = ''
  if (projectId) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        researchNotes: { orderBy: { pinned: 'desc' } },
        sources: { orderBy: { createdAt: 'desc' } },
        scenes: { orderBy: { order: 'asc' } },
        scriptSections: { orderBy: { order: 'asc' } },
        tasks: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (project) {
      context = buildProjectContext(project as unknown as Parameters<typeof buildProjectContext>[0])
    }
  }

  const systemPrompt = [
    'You are the AI co-pilot inside Documentary Studio — a workspace for long-form documentary creators.',
    'You help with: research planning, scriptwriting, scene structuring, source evaluation, fact-checking, interview prep, and narrative thesis refinement.',
    '',
    'Voice & approach:',
    '- Speak as a peer documentary editor, not a corporate assistant.',
    '- Be specific, not generic. Reference the user\'s actual project when relevant.',
    '- When suggesting script changes, write actual prose the user can use — not "you could write about…".',
    '- Flag factual claims that need verification.',
    '- Keep responses tight. Long responses overwhelm.',
    '',
    settings.browsingEnabled
      ? 'BROWSING TOOL: When the user asks you to visit a specific site (ChatGPT, Google Flow, Dreamina, archive pages, anything JS-heavy or behind a login), call POST /api/ai/browse with action:"open" and the URL. The system drives a real browser (Playwright via agent-browser). Tell the user when you\'re doing this.'
      : 'BROWSING TOOL: disabled by user. Stick to webSearch and readUrl.',
    '',
    context ? 'CURRENT PROJECT CONTEXT:' : '',
    context,
  ].filter(Boolean).join('\n')

  try {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of streamChat(
            [
              { role: 'system', content: systemPrompt },
              ...incoming.map(m => ({ role: m.role, content: m.content })),
            ],
            { thinking }
          )) {
            if (delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'stream failed'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'chat failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
