import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ planId: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { planId } = await ctx.params
  const plan = await db.visualPlan.findUnique({ where: { id: planId } })
  if (!plan) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(plan)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { planId } = await ctx.params
  const body = await req.json()
  const data: Record<string, string> = {}
  if (typeof body.title === 'string') data.title = body.title
  if (typeof body.status === 'string') data.status = body.status
  if (typeof body.scriptSnapshot === 'string') data.scriptSnapshot = body.scriptSnapshot
  if (typeof body.scriptSectionId === 'string') data.scriptSectionId = body.scriptSectionId
  if (typeof body.shotsJson === 'string') data.shotsJson = body.shotsJson
  if (typeof body.feedbackJson === 'string') data.feedbackJson = body.feedbackJson
  if (typeof body.remotionCode === 'string') data.remotionCode = body.remotionCode
  if (typeof body.remotionPreview === 'string') data.remotionPreview = body.remotionPreview
  if (typeof body.browserTasksJson === 'string') data.browserTasksJson = body.browserTasksJson

  const plan = await db.visualPlan.update({ where: { id: planId }, data })
  return NextResponse.json(plan)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { planId } = await ctx.params
  await db.visualPlan.delete({ where: { id: planId } })
  return NextResponse.json({ ok: true })
}
