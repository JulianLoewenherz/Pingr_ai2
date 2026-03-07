import { NextRequest, NextResponse } from 'next/server'

import { resolveRequestUser } from '@/lib/supabase/resolve-request-user'
import { scrapeLinkedInProfile, normalizeProfile } from '@/lib/apify'
import { generateLinkedInDraft } from '@/lib/llm'

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
  // Normalize to www.linkedin.com and strip trailing slash + query params
  const path = parsed.pathname.replace(/\/$/, '')
  return `https://www.linkedin.com${path}`
}

export async function POST(request: NextRequest) {
  // --- Auth (cookie session for web app; Bearer token for extension) ---
  const resolved = await resolveRequestUser(request)
  if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId, supabase } = resolved

  // --- Parse body ---
  let linkedinUrl: string
  try {
    const body = await request.json() as { linkedinUrl?: unknown }
    linkedinUrl = String(body.linkedinUrl ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!linkedinUrl || !isValidLinkedInUrl(linkedinUrl)) {
    return NextResponse.json(
      { error: 'linkedinUrl must be a valid linkedin.com/in/ profile URL.' },
      { status: 400 }
    )
  }

  const cleanUrl = cleanLinkedInUrl(linkedinUrl)

  // --- Load user profile ---
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('background, goals, tone, roles, industries, emphasis')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError || !userProfile) {
    return NextResponse.json(
      { error: 'User profile not found. Please complete onboarding first.' },
      { status: 400 }
    )
  }

  // --- Apify: scrape LinkedIn profile ---
  let apifyRaw: Record<string, unknown>
  try {
    apifyRaw = await scrapeLinkedInProfile(cleanUrl)
  } catch (err) {
    console.error('[generate] Apify error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch LinkedIn profile data. The profile may be private or invalid.' },
      { status: 502 }
    )
  }

  // --- Normalize Apify output ---
  const normalized = normalizeProfile(apifyRaw)
  // Pass the full raw payload so the LLM has access to descriptions, skills, about, etc.
  // Later: trim to a curated subset to save tokens.
  const prospectContext = JSON.stringify(apifyRaw)

  // --- Upsert prospect ---
  const { data: prospect, error: prospectError } = await supabase
    .from('prospects')
    .upsert(
      {
        user_id: userId,
        linkedin_url: cleanUrl,
        display_name: normalized.display_name,
        headline: normalized.headline,
        company: normalized.company,
        location: normalized.location,
        apify_raw: apifyRaw,
        status: 'draft_generated',
        status_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,linkedin_url' }
    )
    .select('id, display_name, headline, company, location, status')
    .single()

  if (prospectError || !prospect) {
    console.error('[generate] Prospect upsert error:', prospectError)
    return NextResponse.json({ error: 'Failed to save prospect record.' }, { status: 500 })
  }

  // --- LLM: generate draft ---
  let draft: { draft_text: string; personalization_note: string | null }
  try {
    draft = await generateLinkedInDraft(userProfile, prospectContext)
  } catch (err) {
    console.error('[generate] LLM error:', err)
    return NextResponse.json(
      { error: 'Failed to generate message draft. Please try again.' },
      { status: 502 }
    )
  }

  // --- Insert draft ---
  const { data: draftRow, error: draftError } = await supabase
    .from('drafts')
    .insert({
      user_id: userId,
      prospect_id: prospect.id,
      draft_text: draft.draft_text,
      personalization_note: draft.personalization_note,
    })
    .select('id, draft_text, personalization_note, created_at')
    .single()

  if (draftError || !draftRow) {
    console.error('[generate] Draft insert error:', draftError)
    return NextResponse.json({ error: 'Failed to save generated draft.' }, { status: 500 })
  }

  return NextResponse.json({ prospect, draft: draftRow })
}
