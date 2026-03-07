import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

export type GenerateResult = {
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

export async function generateDraft(linkedinUrl: string): Promise<GenerateResult> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ linkedinUrl }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to generate draft')
  return data as GenerateResult
}

export async function updateStatus(prospectId: string, status: string): Promise<void> {
  await fetch(`${API_BASE}/api/prospects/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ prospectId, status }),
  })
}
