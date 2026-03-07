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
    <div className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden p-8">
      {/* Concentric arch rings — center sits just below the viewport bottom */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2"
          style={{ bottom: '-60px', transform: 'translateX(-50%)' }}
        >
          {([280, 440, 600] as const).map((r, i) => (
            <div
              key={r}
              className="absolute rounded-full border-2 border-foreground"
              style={{
                width: r * 2,
                height: r * 2,
                top: -r,
                left: -r,
                opacity: [0.18, 0.13, 0.09][i],
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex max-w-md flex-col items-center gap-10 text-center">
        <header className="flex flex-col items-center gap-3">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Pingr
          </h1>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Personalized LinkedIn outreach in context. Draft messages where you browse.
          </p>
          <p className="text-xs text-muted-foreground/90">
            Completely free — up to 10 messages a day.
          </p>
          <span
            className="mt-1 block h-px w-16 rounded-full bg-linear-to-r from-transparent via-foreground/20 to-transparent"
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
              <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border/80 bg-muted/20 shadow-sm transition-shadow duration-300 hover:shadow-md hover:border-border">
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
              <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border/80 bg-muted/20 shadow-sm transition-shadow duration-300 hover:shadow-md hover:border-border">
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
