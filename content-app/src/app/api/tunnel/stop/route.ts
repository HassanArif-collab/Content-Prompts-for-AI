import { NextResponse } from 'next/server'
import { stopTunnel, getTunnelStatus } from '@/lib/tunnel'

export async function POST() {
  const wasRunning = stopTunnel()
  return NextResponse.json({ stopped: wasRunning, ...getTunnelStatus() })
}
