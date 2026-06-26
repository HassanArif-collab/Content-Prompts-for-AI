import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; sceneId: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { sceneId } = await ctx.params
  const body = await req.json()
  const scene = await db.scene.update({
    where: { id: sceneId },
    data: {
      order: body.order,
      title: body.title,
      shotType: body.shotType,
      location: body.location,
      description: body.description,
      narration: body.narration,
      duration: body.duration,
      brollNotes: body.brollNotes,
      status: body.status,
    },
  })
  return NextResponse.json(scene)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { sceneId } = await ctx.params
  await db.scene.delete({ where: { id: sceneId } })
  return NextResponse.json({ ok: true })
}
