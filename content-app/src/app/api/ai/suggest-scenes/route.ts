import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chat, buildProjectContext } from '@/lib/ai'

// Suggest storyboard scenes based on the current script.
// Body: { projectId }
// Returns: { suggestions: Array<{ title, shotType, location, description, narration, duration }> }
export async function POST(req: NextRequest) {
  const { projectId } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      researchNotes: true, sources: true, scenes: true,
      scriptSections: true, tasks: true,
    },
  })
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const context = buildProjectContext(project as unknown as Parameters<typeof buildProjectContext>[0])

  const aiResponse = await chat([
    {
      role: 'system',
      content: [
        'You are a documentary director and storyboard artist.',
        'Given a script outline and existing scenes, suggest 4–6 ADDITIONAL scenes that would strengthen the film.',
        'Each scene should serve a specific narrative purpose (emotional beat, evidence, transition, visual texture, etc.).',
        'Do NOT duplicate existing scenes.',
        '',
        'Respond in strict JSON only — no markdown, no preamble. Schema:',
        '{"suggestions":[{"title":string,"shotType":"A-roll"|"B-roll"|"Interview"|"Archival"|"Animation"|"Drone","location":string,"description":string,"narration":string,"duration":number}]}',
        'duration is in seconds (30–120). Keep descriptions under 50 words. Keep narration under 40 words.',
      ].join('\n')
    },
    { role: 'user', content: context }
  ], { thinking: false })

  let suggestions: Array<Record<string, unknown>> = []
  try {
    const cleaned = aiResponse.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed.suggestions)) {
      suggestions = parsed.suggestions
    }
  } catch {
    return NextResponse.json({ error: 'AI response could not be parsed', raw: aiResponse }, { status: 502 })
  }

  return NextResponse.json({ suggestions })
}
