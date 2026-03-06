import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Pingr</h1>

      {user ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email ?? 'you'}</span>
          </p>
          <Button asChild>
            <Link href="/app/prospects">Go to Dashboard</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Button asChild>
            <Link href="/auth/login">Log in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/sign-up">Create account</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
