import { NextRequest, NextResponse } from 'next/server'
import { readUrl, chat } from '@/lib/ai'

// Read a URL, extract content, and (optionally) use AI to draft a source entry.
// Body: { url, draftSource?: boolean }
// Returns: { page: PageContent, sourceDraft?: { title, author, publisher, publicationDate, citation, summary } }
export async function POST(req: NextRequest) {
  const { url, draftSource } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  const page = await readUrl(url)
  if (!page) {
    return NextResponse.json({ error: 'Could not read this URL — it may be behind a paywall, require JavaScript, or block server-side access.' }, { status: 422 })
  }

  if (!draftSource) {
    return NextResponse.json({ page })
  }

  // Use AI to extract structured source metadata from the page text.
  const aiResponse = await chat([
    {
      role: 'system',
      content: 'You are a research librarian. From the page content the user provides, extract a clean citation entry. Respond in strict JSON only — no markdown, no preamble. Schema: {"title": string, "author": string (Last, F. format, empty if unknown), "publisher": string (empty if unknown), "publicationDate": string (YYYY or YYYY-MM-DD, empty if unknown), "citation": string (full APA-style citation), "summary": string (2-3 sentence summary of why this source might matter for a documentary)}.'
    },
    {
      role: 'user',
      content: `URL: ${page.url}\nTITLE: ${page.title}\n\nCONTENT (first 4000 chars):\n${page.text.slice(0, 4000)}`
    }
  ], { thinking: false })

  let sourceDraft: Record<string, string> | null = null
  try {
    // Strip any markdown code fences
    const cleaned = aiResponse.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    sourceDraft = JSON.parse(cleaned)
  } catch {
    sourceDraft = {
      title: page.title,
      author: '',
      publisher: '',
      publicationDate: '',
      citation: `${page.title}. Retrieved from ${page.url}`,
      summary: 'AI could not parse the page metadata automatically — please fill in manually.',
    }
  }

  return NextResponse.json({ page, sourceDraft })
}
