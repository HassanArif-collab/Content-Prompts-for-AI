import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const tasks = await db.task.findMany({
    where: { projectId: id },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const task = await db.task.create({
    data: {
      projectId: id,
      title: body.title,
      category: body.category ?? 'general',
      status: body.status ?? 'todo',
      priority: body.priority ?? 'medium',
      dueDate: body.dueDate ?? '',
      notes: body.notes ?? '',
    },
  })
  return NextResponse.json(task, { status: 201 })
}
