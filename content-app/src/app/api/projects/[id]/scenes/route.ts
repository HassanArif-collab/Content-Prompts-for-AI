import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const scenes = await db.scene.findMany({
    where: { projectId: id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(scenes)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const count = await db.scene.count({ where: { projectId: id } })
  const scene = await db.scene.create({
    data: {
      projectId: id,
      order: body.order ?? count,
      title: body.title,
      shotType: body.shotType ?? 'B-roll',
      location: body.location ?? '',
      description: body.description ?? '',
      narration: body.narration ?? '',
      duration: body.duration ?? 60,
      brollNotes: body.brollNotes ?? '',
      status: body.status ?? 'planned',
    },
  })
  return NextResponse.json(scene, { status: 201 })
}
