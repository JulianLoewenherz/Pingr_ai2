import { NextRequest, NextResponse } from 'next/server'

import { resolveRequestUser } from '@/lib/supabase/resolve-request-user'

const VALID_STATUSES = [
  'draft_generated',
  'copied',
  'marked_sent',
  'replied',
  'skipped',
  'follow_up_needed',
] as const

type ValidStatus = (typeof VALID_STATUSES)[number]

function isValidStatus(s: string): s is ValidStatus {
  return (VALID_STATUSES as readonly string[]).includes(s)
}

export async function POST(request: NextRequest) {
  // --- Auth (cookie session for web app; Bearer token for extension) ---
  const resolved = await resolveRequestUser(request)
  if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId, supabase } = resolved

  // --- Parse body ---
  let prospectId: string
  let status: string
  try {
    const body = await request.json() as { prospectId?: unknown; status?: unknown }
    prospectId = String(body.prospectId ?? '')
    status = String(body.status ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!prospectId) {
    return NextResponse.json({ error: 'prospectId is required' }, { status: 400 })
  }

  if (!status || !isValidStatus(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  // --- Update (user_id check enforced by RLS + explicit .eq) ---
  const { data, error } = await supabase
    .from('prospects')
    .update({
      status,
      status_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId)
    .eq('user_id', userId)
    .select('id, status, status_updated_at')
    .single()

  if (error || !data) {
    console.error('[status] Update error:', error)
    return NextResponse.json(
      { error: 'Failed to update status. Prospect not found or access denied.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ prospect: data })
}
