import { NextRequest } from 'next/server'
import { createClient as createBearerClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from './server'

/**
 * Resolves the authenticated user from an incoming API request.
 *
 * Supports two auth strategies:
 *  1. Bearer token  — used by the Chrome extension (Authorization: Bearer <access_token>)
 *  2. Session cookie — used by the Next.js web app (default Supabase SSR session)
 *
 * Returns `{ userId, supabase }` where `supabase` is the correctly-scoped client
 * so that Supabase RLS policies (auth.uid() = user_id) work for both callers.
 * Returns `null` if the request is unauthenticated.
 */
export async function resolveRequestUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)

    // Create a client that sends the user's JWT on every DB request so RLS works.
    const supabase = createBearerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    )

    // Verify the token is valid and get the user.
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return null

    return { userId: data.user.id, supabase }
  }

  // Cookie-based session (web app).
  const supabase = await createCookieClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return null

  return { userId: data.claims.sub, supabase }
}
