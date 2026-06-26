import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sources = await db.source.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(sources)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const source = await db.source.create({
    data: {
      projectId: id,
      type: body.type ?? 'article',
      title: body.title,
      author: body.author ?? '',
      url: body.url ?? '',
      publisher: body.publisher ?? '',
      publicationDate: body.publicationDate ?? '',
      citation: body.citation ?? '',
      notes: body.notes ?? '',
      credibility: body.credibility ?? 3,
    },
  })
  return NextResponse.json(source, { status: 201 })
}
