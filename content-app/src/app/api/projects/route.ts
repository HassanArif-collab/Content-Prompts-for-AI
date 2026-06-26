import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const projects = await db.project.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: {
          researchNotes: true,
          sources: true,
          scenes: true,
          scriptSections: true,
          tasks: true,
        },
      },
    },
  })
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const project = await db.project.create({
    data: {
      title: body.title,
      logline: body.logline ?? null,
      description: body.description ?? null,
      status: body.status ?? 'research',
      targetRuntime: body.targetRuntime ?? 30,
      narrationWpm: body.narrationWpm ?? 150,
      coverColor: body.coverColor ?? 'amber',
    },
  })
  return NextResponse.json(project, { status: 201 })
}
