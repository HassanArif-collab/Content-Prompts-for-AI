import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; taskId: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { taskId } = await ctx.params
  const body = await req.json()
  const task = await db.task.update({
    where: { id: taskId },
    data: {
      title: body.title,
      category: body.category,
      status: body.status,
      priority: body.priority,
      dueDate: body.dueDate,
      notes: body.notes,
    },
  })
  return NextResponse.json(task)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { taskId } = await ctx.params
  await db.task.delete({ where: { id: taskId } })
  return NextResponse.json({ ok: true })
}
