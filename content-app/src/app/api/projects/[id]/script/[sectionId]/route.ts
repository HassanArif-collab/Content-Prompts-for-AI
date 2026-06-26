import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; sectionId: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { sectionId } = await ctx.params
  const body = await req.json()
  const section = await db.scriptSection.update({
    where: { id: sectionId },
    data: {
      order: body.order,
      type: body.type,
      heading: body.heading,
      content: body.content,
    },
  })
  return NextResponse.json(section)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { sectionId } = await ctx.params
  await db.scriptSection.delete({ where: { id: sectionId } })
  return NextResponse.json({ ok: true })
}
