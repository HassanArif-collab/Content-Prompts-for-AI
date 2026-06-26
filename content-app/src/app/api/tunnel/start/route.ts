import { NextResponse } from 'next/server'
import { getTunnelStatus, startTunnel } from '@/lib/tunnel'

export async function GET() {
  return NextResponse.json(getTunnelStatus())
}

export async function POST() {
  const result = await startTunnel(3000)
  return NextResponse.json(result, { status: 'url' in result ? 200 : 500 })
}
