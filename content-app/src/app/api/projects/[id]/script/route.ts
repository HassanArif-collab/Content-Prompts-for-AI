import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sections = await db.scriptSection.findMany({
    where: { projectId: id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(sections)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const count = await db.scriptSection.count({ where: { projectId: id } })
  const section = await db.scriptSection.create({
    data: {
      projectId: id,
      order: body.order ?? count,
      type: body.type ?? 'act',
      heading: body.heading,
      content: body.content ?? '',
    },
  })
  return NextResponse.json(section, { status: 201 })
}
