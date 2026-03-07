export type ApifyProfileRaw = Record<string, unknown>

export type NormalizedProspect = {
  display_name: string | null
  headline: string | null
  company: string | null
  location: string | null
}

const APIFY_BASE = 'https://api.apify.com/v2'
const ACTOR_ID = 'harvestapi~linkedin-profile-scraper'

type ApifyRunResponse = {
  data: { id: string; defaultDatasetId: string; status: string }
}
type ApifyDatasetResponse = {
  data: { items: ApifyProfileRaw[] }
}

export async function scrapeLinkedInProfile(linkedinUrl: string): Promise<ApifyProfileRaw> {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error('APIFY_TOKEN is not configured')

  // Start the actor run
  const runRes = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileScraperMode: 'Profile details no email ($4 per 1k)',
      queries: [linkedinUrl],
    }),
  })
  if (!runRes.ok) {
    const text = await runRes.text()
    throw new Error(`Apify run start failed (${runRes.status}): ${text}`)
  }
  const { data: run } = await runRes.json() as ApifyRunResponse

  // Poll until the run finishes (max ~55s to stay within the 60s Vercel limit)
  const deadline = Date.now() + 55_000
  let status = run.status
  while (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'ABORTED' && status !== 'TIMED-OUT') {
    if (Date.now() > deadline) throw new Error('Apify run timed out waiting for completion')
    await new Promise((r) => setTimeout(r, 3000))
    const statusRes = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs/${run.id}?token=${token}`)
    if (!statusRes.ok) throw new Error(`Failed to poll Apify run status (${statusRes.status})`)
    const { data: runData } = await statusRes.json() as ApifyRunResponse
    status = runData.status
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify run ended with status: ${status}`)
  }

  // Fetch dataset items
  const datasetRes = await fetch(
    `${APIFY_BASE}/datasets/${run.defaultDatasetId}/items?token=${token}&format=json`
  )
  if (!datasetRes.ok) throw new Error(`Failed to fetch Apify dataset (${datasetRes.status})`)
  const items = await datasetRes.json() as ApifyProfileRaw[]

  if (!items || items.length === 0) {
    throw new Error('No profile data returned from Apify')
  }

  const profile = items[0]

  // Apify returns status 404 on the item when the profile isn't found
  if ((profile.status as number) === 404) {
    throw new Error('LinkedIn profile not found or is private')
  }

  return profile
}

export function normalizeProfile(raw: ApifyProfileRaw): NormalizedProspect {
  const firstName = (raw.firstName as string) ?? ''
  const lastName = (raw.lastName as string) ?? ''
  const display_name = [firstName, lastName].filter(Boolean).join(' ') || null

  const headline = (raw.headline as string) ?? null

  const currentPosition = raw.currentPosition as Array<{ companyName?: string }> | undefined
  const experience = raw.experience as Array<{ companyName?: string }> | undefined
  const company =
    currentPosition?.[0]?.companyName ?? experience?.[0]?.companyName ?? null

  const locationObj = raw.location as { linkedinText?: string } | undefined
  const location = locationObj?.linkedinText ?? null

  return { display_name, headline, company, location }
}

/**
 * Builds a human-readable context string about the prospect for use in the LLM prompt.
 */
export function buildProspectContext(raw: ApifyProfileRaw): string {
  const firstName = (raw.firstName as string) ?? ''
  const lastName = (raw.lastName as string) ?? ''
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown'

  const headline = (raw.headline as string) ?? 'Not listed'

  const locationObj = raw.location as { linkedinText?: string } | undefined
  const location = locationObj?.linkedinText ?? 'Not listed'

  const experience = raw.experience as
    | Array<{
        position?: string
        companyName?: string
        startDate?: { text?: string }
        endDate?: { text?: string }
      }>
    | undefined

  const education = raw.education as
    | Array<{
        schoolName?: string
        degree?: string
        fieldOfStudy?: string
        period?: string
      }>
    | undefined

  const recentExp =
    experience
      ?.slice(0, 3)
      .map(
        (e) =>
          `  - ${e.position ?? 'Unknown role'} at ${e.companyName ?? 'Unknown company'}` +
          (e.startDate?.text ? ` (${e.startDate.text} - ${e.endDate?.text ?? 'Present'})` : '')
      )
      .join('\n') ?? '  None listed'

  const edu =
    education
      ?.slice(0, 2)
      .map(
        (e) =>
          `  - ${[e.degree, e.fieldOfStudy].filter(Boolean).join(' in ')} at ${e.schoolName ?? 'Unknown school'}` +
          (e.period ? ` (${e.period})` : '')
      )
      .join('\n') ?? '  None listed'

  return `Name: ${name}
Headline: ${headline}
Location: ${location}
Recent experience:
${recentExp}
Education:
${edu}`
}
