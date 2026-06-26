import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; sourceId: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { sourceId } = await ctx.params
  const body = await req.json()
  const source = await db.source.update({
    where: { id: sourceId },
    data: {
      type: body.type,
      title: body.title,
      author: body.author,
      url: body.url,
      publisher: body.publisher,
      publicationDate: body.publicationDate,
      citation: body.citation,
      notes: body.notes,
      credibility: body.credibility,
    },
  })
  return NextResponse.json(source)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { sourceId } = await ctx.params
  await db.source.delete({ where: { id: sourceId } })
  return NextResponse.json({ ok: true })
}
