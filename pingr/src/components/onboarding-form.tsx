'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { upsertProfile } from '@/app/onboarding/actions'

type ProfileData = {
  background: string | null
  goals: string | null
  tone: string | null
  roles: string[] | null
  industries: string[] | null
  emphasis: string | null
  linkedin_url: string | null
}

export function OnboardingForm({ existing }: { existing: ProfileData | null }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoFillError, setAutoFillError] = useState<string | null>(null)
  const [autoFilled, setAutoFilled] = useState(false)

  const [linkedinUrl, setLinkedinUrl] = useState(existing?.linkedin_url ?? '')
  const [background, setBackground] = useState(existing?.background ?? '')
  const [goals, setGoals] = useState(existing?.goals ?? '')
  const [tone, setTone] = useState(existing?.tone ?? '')
  const [roles, setRoles] = useState((existing?.roles ?? []).join(', '))
  const [industries, setIndustries] = useState((existing?.industries ?? []).join(', '))
  const [emphasis, setEmphasis] = useState(existing?.emphasis ?? '')

  const handleAutoFill = async () => {
    setAutoFillError(null)
    setAutoFilled(false)

    if (!linkedinUrl.trim()) {
      setAutoFillError('Please enter your LinkedIn profile URL first.')
      return
    }

    setIsAutoFilling(true)

    try {
      const res = await fetch('/api/autofill-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: linkedinUrl.trim() }),
      })

      const data = await res.json() as {
        fields?: {
          background: string
          goals: string
          tone: string
          roles: string[]
          industries: string[]
          emphasis: string
        }
        error?: string
      }

      if (!res.ok || data.error) {
        setAutoFillError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      if (data.fields) {
        setBackground(data.fields.background)
        setGoals(data.fields.goals)
        setTone(data.fields.tone)
        setRoles(data.fields.roles.join(', '))
        setIndustries(data.fields.industries.join(', '))
        setEmphasis(data.fields.emphasis)
        setAutoFilled(true)
      }
    } catch {
      setAutoFillError('Network error. Please try again.')
    } finally {
      setIsAutoFilling(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await upsertProfile({
      background,
      goals,
      tone,
      roles: roles.split(',').map((s) => s.trim()).filter(Boolean),
      industries: industries.split(',').map((s) => s.trim()).filter(Boolean),
      emphasis,
      linkedin_url: linkedinUrl.trim() || undefined,
    })

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      router.push('/app/prospects')
    }
  }

  const textareaClass =
    'rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none w-full'

  return (
    <div className="relative flex min-h-svh items-center justify-center p-6">
      {existing && (
        <Link
          href="/app/prospects"
          className="absolute left-6 top-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to prospects"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      )}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {existing ? 'Update your profile' : 'Set up your profile'}
          </CardTitle>
          <CardDescription>
            This context is used to personalise every outreach message you generate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Auto-fill section */}
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 flex flex-col gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="linkedin_url">Your LinkedIn profile URL</Label>
                <p className="text-xs text-muted-foreground">
                  Paste your LinkedIn URL to auto-fill the fields below.
                </p>
                <Input
                  id="linkedin_url"
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => {
                    setLinkedinUrl(e.target.value)
                    setAutoFillError(null)
                    setAutoFilled(false)
                  }}
                  placeholder="https://www.linkedin.com/in/your-name"
                  disabled={isAutoFilling}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAutoFill}
                disabled={isAutoFilling || isLoading}
                className="w-full"
              >
                {isAutoFilling ? 'Scanning your LinkedIn… this may take up to 30 seconds' : 'Auto-fill for me'}
              </Button>
              {autoFillError && (
                <p className="text-sm text-red-500">{autoFillError}</p>
              )}
              {autoFilled && (
                <p className="text-sm text-green-600">
                  Fields filled from your LinkedIn — review and edit before saving.
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="background">Background</Label>
              <p className="text-xs text-muted-foreground">
                School, degree, year, work experience — who you are.
              </p>
              <textarea
                id="background"
                rows={3}
                required
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className={textareaClass}
                placeholder="e.g. Junior at Stanford studying CS, prev intern at Stripe"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="goals">Recruiting goals</Label>
              <p className="text-xs text-muted-foreground">
                What are you looking for? Why are you reaching out?
              </p>
              <textarea
                id="goals"
                rows={2}
                required
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className={textareaClass}
                placeholder="e.g. Exploring PM roles in fintech for full-time 2026"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="tone">Preferred tone</Label>
              <Input
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. friendly, direct, professional"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="roles">Roles of interest</Label>
              <p className="text-xs text-muted-foreground">Comma-separated.</p>
              <Input
                id="roles"
                value={roles}
                onChange={(e) => setRoles(e.target.value)}
                placeholder="e.g. Product Manager, Software Engineer"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="industries">Industries of interest</Label>
              <p className="text-xs text-muted-foreground">Comma-separated.</p>
              <Input
                id="industries"
                value={industries}
                onChange={(e) => setIndustries(e.target.value)}
                placeholder="e.g. Fintech, Healthcare, AI"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="emphasis">Details to emphasize</Label>
              <p className="text-xs text-muted-foreground">
                Anything specific to highlight in outreach (optional).
              </p>
              <textarea
                id="emphasis"
                rows={2}
                value={emphasis}
                onChange={(e) => setEmphasis(e.target.value)}
                className={textareaClass}
                placeholder="e.g. I went to the same school as many people at this company"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={isLoading || isAutoFilling}>
              {isLoading ? 'Saving...' : existing ? 'Update profile' : 'Save and continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
