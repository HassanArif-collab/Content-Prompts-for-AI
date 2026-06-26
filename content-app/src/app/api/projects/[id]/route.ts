import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const project = await db.project.findUnique({
    where: { id },
    include: {
      researchNotes: { orderBy: { pinned: 'desc' } },
      sources: { orderBy: { createdAt: 'desc' } },
      scenes: { orderBy: { order: 'asc' } },
      scriptSections: { orderBy: { order: 'asc' } },
      tasks: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const project = await db.project.update({
    where: { id },
    data: {
      title: body.title,
      logline: body.logline,
      description: body.description,
      status: body.status,
      targetRuntime: body.targetRuntime,
      narrationWpm: body.narrationWpm,
      coverColor: body.coverColor,
    },
  })
  return NextResponse.json(project)
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await db.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
