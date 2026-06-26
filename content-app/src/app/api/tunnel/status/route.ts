import { NextResponse } from 'next/server'
import { getTunnelStatus } from '@/lib/tunnel'

export async function GET() {
  return NextResponse.json(getTunnelStatus())
}
