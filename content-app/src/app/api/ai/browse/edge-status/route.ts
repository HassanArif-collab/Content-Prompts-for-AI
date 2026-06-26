// Edge CDP health check
import { NextResponse } from 'next/server'
import { checkEdgeCdp } from '@/lib/tool-runner'

export async function GET() {
  const status = await checkEdgeCdp()
  return NextResponse.json(status)
}
