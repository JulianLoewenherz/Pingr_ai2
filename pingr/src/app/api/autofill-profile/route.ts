import { NextRequest, NextResponse } from 'next/server'

import { resolveRequestUser } from '@/lib/supabase/resolve-request-user'
import { scrapeLinkedInProfile } from '@/lib/apify'
import { extractSelfProfileFromLinkedIn } from '@/lib/llm'

// Apify can take up to ~30s; add LLM time on top
export const maxDuration = 60

function isValidLinkedInUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      (parsed.hostname === 'www.linkedin.com' || parsed.hostname === 'linkedin.com') &&
      parsed.pathname.startsWith('/in/')
    )
  } catch {
    return false
  }
}

function cleanLinkedInUrl(url: string): string {
  const parsed = new URL(url)
  const path = parsed.pathname.replace(/\/$/, '')
  return `https://www.linkedin.com${path}`
}

export async function POST(request: NextRequest) {
  const resolved = await resolveRequestUser(request)
  if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId, supabase } = resolved

  let linkedinUrl: string
  try {
    const body = await request.json() as { linkedinUrl?: unknown }
    linkedinUrl = String(body.linkedinUrl ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!linkedinUrl || !isValidLinkedInUrl(linkedinUrl)) {
    return NextResponse.json(
      { error: 'Please enter a valid LinkedIn profile URL (linkedin.com/in/...).' },
      { status: 400 }
    )
  }

  const cleanUrl = cleanLinkedInUrl(linkedinUrl)

  // Scrape the user's own LinkedIn profile
  let apifyRaw: Record<string, unknown>
  try {
    apifyRaw = await scrapeLinkedInProfile(cleanUrl)
  } catch (err) {
    console.error('[autofill-profile] Apify error:', err)
    const message =
      err instanceof Error && err.message.includes('not found or is private')
        ? 'This LinkedIn profile is private or could not be found. Make sure your profile is public.'
        : 'Failed to fetch your LinkedIn profile. Please check the URL and try again.'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Persist the raw data and URL immediately so it's not lost if the user navigates away
  const { error: saveRawError } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        linkedin_url: cleanUrl,
        linkedin_raw: apifyRaw,
        linkedin_scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (saveRawError) {
    console.error('[autofill-profile] Failed to save linkedin_raw:', saveRawError)
    // Non-fatal — continue and return the extracted fields anyway
  }

  // Extract structured profile fields via LLM
  let extracted: Awaited<ReturnType<typeof extractSelfProfileFromLinkedIn>>
  try {
    extracted = await extractSelfProfileFromLinkedIn(apifyRaw)
  } catch (err) {
    console.error('[autofill-profile] LLM error:', err)
    return NextResponse.json(
      { error: 'Failed to extract profile data. Please try again.' },
      { status: 502 }
    )
  }

  return NextResponse.json({
    linkedinUrl: cleanUrl,
    fields: extracted,
  })
}
