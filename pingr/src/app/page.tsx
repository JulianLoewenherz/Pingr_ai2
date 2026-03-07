import Link from 'next/link'
import Image from 'next/image'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ProfileIconWithEmail } from '@/components/profile-icon-with-email'
import { ExtensionInstallModal } from '@/components/extension-install-modal'

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  const email = (user?.email as string) ?? null

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-10 text-center">
        <header className="flex flex-col items-center gap-3">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Pingr
          </h1>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Personalized LinkedIn outreach in context. Draft messages where you browse.
          </p>
          <span
            className="mt-1 block h-px w-12 rounded-full bg-border"
            aria-hidden
          />
        </header>

        {email ? (
          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-4">
              <ProfileIconWithEmail email={email} />
              <Button asChild className="font-serif">
                <Link href="/app/prospects">Go to Dashboard</Link>
              </Button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full max-w-sm overflow-hidden rounded-xl border bg-muted/20 shadow-sm">
                <Image
                  src="/extension-in-action.png"
                  alt="Pingr extension side panel on a LinkedIn profile"
                  width={448}
                  height={320}
                  className="w-full h-auto object-cover"
                />
              </div>
              <p className="text-xs text-muted-foreground">Extension in action</p>
            </div>
            <ExtensionInstallModal />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-4 sm:flex-row">
              <Button asChild className="font-serif">
                <Link href="/auth/login">Log in</Link>
              </Button>
              <Button asChild variant="outline" className="font-serif">
                <Link href="/auth/sign-up">Create account</Link>
              </Button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full max-w-sm overflow-hidden rounded-xl border bg-muted/20 shadow-sm">
                <Image
                  src="/extension-in-action.png"
                  alt="Pingr extension side panel on a LinkedIn profile"
                  width={448}
                  height={320}
                  className="w-full h-auto object-cover"
                />
              </div>
              <p className="text-xs text-muted-foreground">Extension in action</p>
            </div>
            <ExtensionInstallModal />
          </div>
        )}
      </div>
    </div>
  )
}
