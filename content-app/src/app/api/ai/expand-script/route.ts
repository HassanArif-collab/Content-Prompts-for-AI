import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chat, buildProjectContext } from '@/lib/ai'

// Expand a script section with AI.
// Body: { projectId, sectionId, instruction? }
// Returns: { content }
export async function POST(req: NextRequest) {
  const { projectId, sectionId, instruction } = await req.json()
  if (!projectId || !sectionId) {
    return NextResponse.json({ error: 'projectId and sectionId required' }, { status: 400 })
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      researchNotes: true,
      sources: true,
      scenes: true,
      scriptSections: { orderBy: { order: 'asc' } },
      tasks: true,
    },
  })
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const section = project.scriptSections.find(s => s.id === sectionId)
  if (!section) return NextResponse.json({ error: 'section not found' }, { status: 404 })

  const context = buildProjectContext(project as unknown as Parameters<typeof buildProjectContext>[0])

  const userPrompt = [
    `Expand the script section "${section.heading}" (type: ${section.type}).`,
    '',
    `Current content (${section.content.trim().split(/\s+/).filter(Boolean).length} words):`,
    section.content || '(empty — please draft from scratch)',
    '',
    `Target runtime for the whole film: ${project.targetRuntime} minutes at ${project.narrationWpm} wpm.`,
    `So the full script needs ~${Math.round(project.targetRuntime * project.narrationWpm).toLocaleString()} words.`,
    '',
    instruction ? `Specific instruction from the creator: ${instruction}` : 'No specific instruction — expand naturally based on the project context.',
    '',
    'Write the expanded narration as ready-to-record prose. No headings, no commentary, no preamble. Just the narration text. Aim for 200–400 words unless the instruction says otherwise.',
  ].join('\n')

  const content = await chat([
    { role: 'system', content: `You are a documentary scriptwriter. Expand the given section with grounded, specific, well-researched narration.\n\n${context}` },
    { role: 'user', content: userPrompt },
  ], { thinking: false })

  return NextResponse.json({ content })
}
