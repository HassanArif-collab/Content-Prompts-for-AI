import { NextRequest, NextResponse } from 'next/server'
import { webSearch } from '@/lib/ai'

// Body: { query, num? }
// Returns: { results: SearchResult[] }
export async function POST(req: NextRequest) {
  const { query, num } = await req.json()
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query required' }, { status: 400 })
  }
  const results = await webSearch(query, typeof num === 'number' ? num : 8)
  return NextResponse.json({ results })
}
