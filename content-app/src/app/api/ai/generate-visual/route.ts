import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateImage, chat, buildProjectContext } from '@/lib/ai'

// Generate a visual concept for a storyboard scene.
// Body: { projectId, sceneId }
// Returns: { imageBase64, prompt }
export async function POST(req: NextRequest) {
  const { projectId, sceneId } = await req.json()
  if (!projectId || !sceneId) {
    return NextResponse.json({ error: 'projectId and sceneId required' }, { status: 400 })
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      researchNotes: true, sources: true, scenes: true,
      scriptSections: true, tasks: true,
    },
  })
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const scene = project.scenes.find(s => s.id === sceneId)
  if (!scene) return NextResponse.json({ error: 'scene not found' }, { status: 404 })

  const context = buildProjectContext(project as unknown as Parameters<typeof buildProjectContext>[0])

  // Ask AI to translate scene details into a cinematic image prompt
  const promptText = await chat([
    {
      role: 'system',
      content: [
        'You translate documentary scene descriptions into cinematic image-generation prompts.',
        'Output ONE single prompt — no preamble, no explanation, no markdown.',
        'Style: cinematic, documentary, photo-realistic, natural lighting, 35mm look, shallow depth of field.',
        'Avoid: text overlays, captions, watermarks, cartoonish style.',
        'Maximum 80 words.',
      ].join(' ')
    },
    {
      role: 'user',
      content: [
        `Scene title: ${scene.title}`,
        `Shot type: ${scene.shotType}`,
        `Location: ${scene.location || 'unspecified'}`,
        `Description: ${scene.description || 'unspecified'}`,
        `B-roll notes: ${scene.brollNotes || 'none'}`,
        `Narration (for mood): ${scene.narration || 'none'}`,
        '',
        `Project context for tone:`,
        context.slice(0, 1500),
      ].join('\n')
    }
  ], { thinking: false })

  const cleanedPrompt = promptText.trim().split('\n').slice(0, 4).join(' ').slice(0, 500)

  const size: '1024x1024' | '1344x768' | '768x1344' =
    scene.shotType === 'Interview' ? '768x1344' :
    scene.shotType === 'Drone' ? '1344x768' :
    '1344x768'

  const imageBase64 = await generateImage(cleanedPrompt, size)

  if (!imageBase64) {
    return NextResponse.json({ error: 'Image generation failed — please try again.' }, { status: 500 })
  }

  return NextResponse.json({ imageBase64, prompt: cleanedPrompt })
}
