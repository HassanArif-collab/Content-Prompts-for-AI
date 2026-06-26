import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chat, webSearch, buildProjectContext } from '@/lib/ai'

// Research a topic: do web search, then ask AI to synthesize into structured notes.
// Body: { projectId, topic, depth? }
// Returns: { notes: Array<{ title, content, category, tags }>, sources: Array<{ title, url, snippet }> }
export async function POST(req: NextRequest) {
  const { projectId, topic, depth } = await req.json()
  if (!projectId || !topic) {
    return NextResponse.json({ error: 'projectId and topic required' }, { status: 400 })
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      researchNotes: true, sources: true, scenes: true,
      scriptSections: true, tasks: true,
    },
  })
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const context = buildProjectContext(project as unknown as Parameters<typeof buildProjectContext>[0])

  // 1. Web search for fresh info
  const results = await webSearch(topic, depth === 'deep' ? 10 : 6)

  // 2. AI synthesis into structured research notes
  const searchContext = results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`).join('\n\n')

  const aiResponse = await chat([
    {
      role: 'system',
      content: [
        'You are a documentary research assistant.',
        'Given a topic, web search results, and the user\'s project context, produce 3–5 research notes that would genuinely help the filmmaker.',
        'Each note should be a specific, actionable insight — not a generic summary.',
        'Tag each note with the right category (interview, archival, context, fact-check, or general).',
        'Cite web search results by [number] inside the content when relevant.',
        '',
        'Respond in strict JSON only. Schema:',
        '{"notes":[{"title":string,"content":string,"category":"interview"|"archival"|"context"|"fact-check"|"general","tags":string}]}',
        'content should be 80–200 words. tags is comma-separated.',
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `TOPIC TO RESEARCH: ${topic}`,
        '',
        `PROJECT CONTEXT:`,
        context.slice(0, 2500),
        '',
        'WEB SEARCH RESULTS:',
        searchContext || '(no results returned — synthesize from your own knowledge but flag this)',
      ].join('\n')
    }
  ], { thinking: false })

  let notes: Array<Record<string, string>> = []
  try {
    const cleaned = aiResponse.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed.notes)) notes = parsed.notes
  } catch {
    return NextResponse.json({ error: 'AI response could not be parsed', raw: aiResponse, sources: results }, { status: 502 })
  }

  return NextResponse.json({ notes, sources: results })
}
