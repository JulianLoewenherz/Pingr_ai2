import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { generateDraft, updateStatus, type GenerateResult } from '../../lib/api'

type View = 'checking' | 'login' | 'main'

const LINKEDIN_PROFILE_RE = /^https:\/\/(www\.)?linkedin\.com\/in\//

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  root: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '14px',
    color: '#111',
    backgroundColor: '#fff',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em' },
  body: { padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '16px', flex: 1 },
  label: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '6px' },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  btn: (variant: 'primary' | 'outline' | 'ghost') => ({
    padding: '9px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    border: variant === 'outline' ? '1px solid #d1d5db' : 'none',
    backgroundColor: variant === 'primary' ? '#111' : variant === 'outline' ? '#fff' : 'transparent',
    color: variant === 'primary' ? '#fff' : '#111',
  }),
  error: {
    fontSize: '13px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '10px 12px',
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  muted: { fontSize: '12px', color: '#6b7280' },
  mono: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '13px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap' as const,
  },
  badge: (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      draft_generated: { bg: '#dbeafe', color: '#1d4ed8' },
      copied: { bg: '#fef9c3', color: '#92400e' },
      marked_sent: { bg: '#dcfce7', color: '#15803d' },
    }
    const c = map[status] ?? { bg: '#f3f4f6', color: '#374151' }
    return {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      backgroundColor: c.bg,
      color: c.color,
    }
  },
  divider: { borderTop: '1px solid #e5e7eb', margin: '0 -20px', padding: '0' },
  row: { display: 'flex', gap: '8px', flexWrap: 'wrap' as const },
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Checking() {
  return (
    <div style={{ ...s.body, alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
      Loading…
    </div>
  )
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    onLogin()
  }

  return (
    <div style={s.body}>
      <div>
        <p style={{ fontWeight: 600, marginBottom: '4px' }}>Sign in to Pingr</p>
        <p style={s.muted}>Use the same account as the Pingr web app.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={s.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={s.input}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label style={s.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            style={s.input}
            placeholder="••••••••"
          />
        </div>
        {error && <p style={s.error}>{error}</p>}
        <button type="submit" disabled={loading} style={{ ...s.btn('primary'), width: '100%' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function MainPanel({ onLogout }: { onLogout: () => void }) {
  const [tabUrl, setTabUrl] = useState<string | null>(null)
  const [isProfile, setIsProfile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [editedText, setEditedText] = useState('')
  const [copied, setCopied] = useState(false)
  const [statusSent, setStatusSent] = useState(false)

  useEffect(() => {
    if (result) setEditedText(result.draft.draft_text)
  }, [result])

  // Get the active tab URL whenever the panel mounts or gains focus
  function refreshTabUrl() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? null
      setTabUrl(url)
      setIsProfile(url !== null && LINKEDIN_PROFILE_RE.test(url))
    })
  }

  useEffect(() => {
    refreshTabUrl()
    // Also re-check when the active tab changes
    const onActivated = () => refreshTabUrl()
    const onUpdated = (_: number, change: chrome.tabs.TabChangeInfo) => {
      if (change.url !== undefined) refreshTabUrl()
    }
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onUpdated.addListener(onUpdated)
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
    }
  }, [])

  async function handleGenerate() {
    if (!tabUrl) return
    setLoading(true)
    setError(null)
    setResult(null)
    setCopied(false)
    setStatusSent(false)
    try {
      const data = await generateDraft(tabUrl)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result || !editedText) return
    await navigator.clipboard.writeText(editedText)
    setCopied(true)
    await updateStatus(result.prospect.id, 'copied')
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleMarkSent() {
    if (!result) return
    await updateStatus(result.prospect.id, 'marked_sent')
    setStatusSent(true)
  }

  return (
    <>
      <div style={s.header}>
        <span style={s.headerTitle}>Pingr</span>
        <button onClick={onLogout} style={{ ...s.btn('ghost'), fontSize: '12px', color: '#6b7280', padding: '4px 8px' }}>
          Sign out
        </button>
      </div>

      <div style={s.body}>
        {/* Current page status */}
        {isProfile ? (
          <div style={s.card}>
            <div>
              <p style={s.muted}>Current LinkedIn profile</p>
              <p style={{ fontSize: '13px', wordBreak: 'break-all', marginTop: '2px' }}>{tabUrl}</p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{ ...s.btn('primary'), alignSelf: 'flex-start' }}
            >
              {loading ? 'Generating…' : 'Generate message'}
            </button>
            {error && <p style={s.error}>{error}</p>}
          </div>
        ) : (
          <div
            style={{
              ...s.card,
              borderStyle: 'dashed',
              textAlign: 'center',
              color: '#6b7280',
              padding: '32px 20px',
            }}
          >
            Open a LinkedIn profile page<br />and click Generate.
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={s.card}>
            {/* Prospect */}
            <div>
              <p style={s.muted}>Prospect</p>
              <p style={{ fontWeight: 600, marginTop: '2px' }}>
                {result.prospect.display_name ?? 'Unknown'}
              </p>
              {(result.prospect.headline || result.prospect.company) && (
                <p style={s.muted}>
                  {[result.prospect.headline, result.prospect.company].filter(Boolean).join(' · ')}
                </p>
              )}
              <span style={s.badge(result.prospect.status)}>
                {result.prospect.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div style={s.divider} />

            {/* Draft */}
            <div>
              <p style={s.muted}>Generated message</p>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={6}
                style={{
                  ...s.mono,
                  marginTop: '6px',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                  resize: 'vertical' as const,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <p style={{ ...s.muted, marginTop: '4px' }}>{editedText.length} characters</p>
            </div>

            {/* Personalization note */}
            {result.draft.personalization_note && (
              <div>
                <p style={s.muted}>Personalization angle</p>
                <p style={{ ...s.muted, fontStyle: 'italic', marginTop: '2px' }}>
                  {result.draft.personalization_note}
                </p>
              </div>
            )}

            {/* Actions */}
            <div style={s.row}>
              <button onClick={handleCopy} disabled={loading} style={s.btn('primary')}>
                {copied ? 'Copied!' : 'Copy message'}
              </button>
              <button onClick={handleGenerate} disabled={loading} style={s.btn('outline')}>
                {loading ? 'Regenerating…' : 'Regenerate'}
              </button>
              {!statusSent && (
                <button onClick={handleMarkSent} disabled={loading} style={s.btn('outline')}>
                  Mark sent
                </button>
              )}
              {statusSent && (
                <span style={{ ...s.muted, alignSelf: 'center' }}>✓ Marked as sent</span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('checking')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setView(session ? 'main' : 'login')
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setView('login')
  }

  return (
    <div style={s.root}>
      {view === 'checking' && <Checking />}
      {view === 'login' && <LoginForm onLogin={() => setView('main')} />}
      {view === 'main' && <MainPanel onLogout={handleLogout} />}
    </div>
  )
}
