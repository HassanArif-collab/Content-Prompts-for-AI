import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const notes = await db.researchNote.findMany({
    where: { projectId: id },
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
  })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  // ponytail: explicit null handling — nullish coalescing can pass undefined to Prisma
  // which can crash the route under turbopack
  const data: {
    projectId: string
    parentId: string | null
    title: string
    content: string
    url: string
    category: string
    tags: string
    pinned: boolean
  } = {
    projectId: id,
    parentId: typeof body.parentId === 'string' ? body.parentId : null,
    title: String(body.title ?? ''),
    content: String(body.content ?? ''),
    url: String(body.url ?? ''),
    category: String(body.category ?? 'general'),
    tags: String(body.tags ?? ''),
    pinned: Boolean(body.pinned ?? false),
  }
  const note = await db.researchNote.create({ data })
  return NextResponse.json(note, { status: 201 })
}
