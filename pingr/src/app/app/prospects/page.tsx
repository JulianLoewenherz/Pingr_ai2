import { redirect } from 'next/navigation'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'
import { GenerateDraftForm } from '@/components/generate-draft-form'

type Prospect = {
  id: string
  linkedin_url: string
  display_name: string | null
  headline: string | null
  company: string | null
  status: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  draft_generated: 'Draft',
  copied: 'Copied',
  marked_sent: 'Sent',
  replied: 'Replied',
  skipped: 'Skipped',
  follow_up_needed: 'Follow up',
}

const STATUS_COLORS: Record<string, string> = {
  draft_generated: 'bg-blue-100 text-blue-700',
  copied: 'bg-yellow-100 text-yellow-700',
  marked_sent: 'bg-green-100 text-green-700',
  replied: 'bg-purple-100 text-purple-700',
  skipped: 'bg-gray-100 text-gray-500',
  follow_up_needed: 'bg-orange-100 text-orange-700',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function ProspectsPage() {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', authData.claims.sub)
    .maybeSingle()

  if (!profile) {
    redirect('/onboarding')
  }

  const { data: prospects } = await supabase
    .from('prospects')
    .select('id, linkedin_url, display_name, headline, company, status, created_at')
    .order('created_at', { ascending: false })

  const list = (prospects ?? []) as Prospect[]

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold hover:opacity-70 transition-opacity">Pingr</Link>
          <div className="flex items-center gap-4">
            <Link
              href="/onboarding"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Edit profile
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 flex flex-col gap-8">
        <GenerateDraftForm />

        <div>
          <div className="mb-4">
            <h1 className="text-2xl font-semibold">Prospects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {list.length === 0
                ? 'No prospects yet — generate your first draft above.'
                : `${list.length} prospect${list.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <p className="text-sm text-muted-foreground">
                Paste a LinkedIn URL above to generate your first outreach message.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((prospect) => {
                const label = prospect.status
                  ? (STATUS_LABELS[prospect.status] ?? prospect.status)
                  : null
                const color = prospect.status
                  ? (STATUS_COLORS[prospect.status] ?? 'bg-gray-100 text-gray-500')
                  : null
                const name = prospect.display_name ?? prospect.linkedin_url
                const sub = [prospect.headline, prospect.company].filter(Boolean).join(' · ')

                return (
                  <li
                    key={prospect.id}
                    className="flex items-center justify-between rounded-xl border px-5 py-4"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-medium text-sm truncate">{name}</span>
                      {sub && (
                        <span className="text-xs text-muted-foreground truncate">{sub}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      {label && color && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
                          {label}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(prospect.created_at)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
