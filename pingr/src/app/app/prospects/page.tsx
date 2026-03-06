import { redirect } from 'next/navigation'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'

export default async function ProspectsPage() {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    redirect('/auth/login')
  }

  // Gate: no profile → onboarding
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', authData.claims.sub)
    .maybeSingle()

  if (!profile) {
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Prospects</h1>
      <p className="text-muted-foreground">
        Your outreach dashboard is coming soon.
        <br />
        Install the Chrome extension to start generating messages.
      </p>
      <div className="flex gap-3">
        <Link
          href="/onboarding"
          className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
        >
          Edit profile
        </Link>
        <LogoutButton />
      </div>
    </div>
  )
}
