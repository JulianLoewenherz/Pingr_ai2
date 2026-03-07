'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type GenerateResult = {
  prospect: {
    id: string
    display_name: string | null
    headline: string | null
    company: string | null
    location: string | null
    status: string
  }
  draft: {
    id: string
    draft_text: string
    personalization_note: string | null
    created_at: string
  }
}

export function GenerateDraftForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    setCopied(false)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: url }),
      })

      const data = await res.json() as { error?: string } & Partial<GenerateResult>

      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Something went wrong. Please try again.')
        return
      }

      setResult(data as GenerateResult)
      onSuccess?.()
      router.refresh()
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result?.draft.draft_text) return
    await navigator.clipboard.writeText(result.draft.draft_text)
    setCopied(true)

    // Update status to 'copied'
    await fetch('/api/prospects/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectId: result.prospect.id, status: 'copied' }),
    })

    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate() {
    if (!url) return
    setLoading(true)
    setError(null)
    setCopied(false)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: url }),
      })

      const data = await res.json() as { error?: string } & Partial<GenerateResult>

      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Something went wrong.')
        return
      }

      setResult(data as GenerateResult)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border p-6 flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-base">Generate a draft</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste a LinkedIn profile URL to scrape the profile and generate a personalized message.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="linkedin-url">LinkedIn profile URL</Label>
          <div className="flex gap-2">
            <Input
              id="linkedin-url"
              type="url"
              placeholder="https://www.linkedin.com/in/username"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !url}>
              {loading ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="flex flex-col gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              Prospect
            </p>
            <p className="font-medium text-sm">
              {result.prospect.display_name ?? 'Unknown'}
            </p>
            {(result.prospect.headline || result.prospect.company) && (
              <p className="text-xs text-muted-foreground">
                {[result.prospect.headline, result.prospect.company]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              Generated message
            </p>
            <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm leading-relaxed">
              {result.draft.draft_text}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {result.draft.draft_text.length} characters
            </p>
          </div>

          {result.draft.personalization_note && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                Personalization angle
              </p>
              <p className="text-xs text-muted-foreground italic">
                {result.draft.personalization_note}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCopy} variant="default" size="sm" disabled={loading}>
              {copied ? 'Copied!' : 'Copy message'}
            </Button>
            <Button
              onClick={handleRegenerate}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? 'Regenerating…' : 'Regenerate'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
