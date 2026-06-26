import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; noteId: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { noteId } = await ctx.params
  const body = await req.json()
  // ponytail: explicit type coercion (same fix as POST route — undefined crashes Prisma under turbopack)
  const data: {
    title?: string
    content?: string
    url?: string
    parentId?: string | null
    category?: string
    tags?: string
    pinned?: boolean
  } = {}
  if (typeof body.title === 'string') data.title = body.title
  if (typeof body.content === 'string') data.content = body.content
  if (typeof body.url === 'string') data.url = body.url
  if (body.parentId === null || typeof body.parentId === 'string') data.parentId = body.parentId
  if (typeof body.category === 'string') data.category = body.category
  if (typeof body.tags === 'string') data.tags = body.tags
  if (typeof body.pinned === 'boolean') data.pinned = body.pinned

  const note = await db.researchNote.update({
    where: { id: noteId },
    data,
  })
  return NextResponse.json(note)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { noteId } = await ctx.params
  // Cascade: delete children first, then the parent
  await db.researchNote.deleteMany({ where: { parentId: noteId } })
  await db.researchNote.delete({ where: { id: noteId } })
  return NextResponse.json({ ok: true })
}
