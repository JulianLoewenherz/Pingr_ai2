'use server'

import { createClient } from '@/lib/supabase/server'

type ProfileInput = {
  background: string
  goals: string
  tone: string
  roles: string[]
  industries: string[]
  emphasis: string
}

export async function upsertProfile(data: ProfileInput): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    return { error: 'Not authenticated' }
  }

  const userId = authData.claims.sub

  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      background: data.background,
      goals: data.goals,
      tone: data.tone,
      roles: data.roles,
      industries: data.industries,
      emphasis: data.emphasis,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
