import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const plans = await db.visualPlan.findMany({
    where: { projectId: id },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(plans)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const plan = await db.visualPlan.create({
    data: {
      projectId: id,
      title: typeof body.title === 'string' ? body.title : 'Untitled plan',
      status: typeof body.status === 'string' ? body.status : 'draft',
      scriptSnapshot: typeof body.scriptSnapshot === 'string' ? body.scriptSnapshot : '',
      scriptSectionId: typeof body.scriptSectionId === 'string' ? body.scriptSectionId : '',
      shotsJson: typeof body.shotsJson === 'string' ? body.shotsJson : JSON.stringify(body.shots ?? []),
      feedbackJson: typeof body.feedbackJson === 'string' ? body.feedbackJson : JSON.stringify(body.feedback ?? []),
      remotionCode: typeof body.remotionCode === 'string' ? body.remotionCode : '',
      remotionPreview: typeof body.remotionPreview === 'string' ? body.remotionPreview : '',
      browserTasksJson: typeof body.browserTasksJson === 'string' ? body.browserTasksJson : JSON.stringify(body.browserTasks ?? []),
    },
  })
  return NextResponse.json(plan, { status: 201 })
}
