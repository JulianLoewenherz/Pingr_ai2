import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    redirect('/auth/login')
  }

  // Load existing profile (null if first visit)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('background, goals, tone, roles, industries, emphasis')
    .eq('user_id', authData.claims.sub)
    .maybeSingle()

  return <OnboardingForm existing={profile} />
}
