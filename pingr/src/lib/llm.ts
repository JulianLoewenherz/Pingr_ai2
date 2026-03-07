import OpenAI from 'openai'
import type { ApifyProfileRaw } from './apify'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type UserProfileContext = {
  background: string | null
  goals: string | null
  tone: string | null
  roles: string[] | null
  industries: string[] | null
  emphasis: string | null
}

export type ExtractedSelfProfile = {
  background: string
  goals: string
  tone: string
  roles: string[]
  industries: string[]
  emphasis: string
}

export async function extractSelfProfileFromLinkedIn(
  raw: ApifyProfileRaw
): Promise<ExtractedSelfProfile> {
  const systemPrompt = `You are an assistant that extracts structured profile information from a LinkedIn profile JSON.
You will return a JSON object with specific fields used to personalize outreach messages.
Always respond with valid JSON only, no markdown, no explanation.`

  const userPrompt = `Given this LinkedIn profile JSON, extract the following fields:

- background: A very detailed description of who this person is — their education (school, degree, year if available) and work, volunteering and club experience.
- goals: Your best inference about what career goals this person likely has based on their trajectory. Be specific if possible (e.g. "Exploring product management roles in fintech"). If unclear, write a reasonable guess.
- tone: Infer a writing tone that would suit this person based on their profile (e.g. "professional", "friendly and direct", "warm and conversational"). Default to "friendly and professional" if unsure.
- roles: An array of job title strings representing their likely roles of interest, inferred from their experience. e.g. ["Software Engineer", "Engineering Manager"]
- industries: An array of industry strings they likely care about, inferred from past employers/roles. e.g. ["Fintech", "AI", "Healthcare"]
- emphasis: One sentence about something distinctive to emphasize in outreach — a standout project, prestigious employer, unique background, etc. Leave as empty string if nothing stands out.

LinkedIn profile JSON:
${JSON.stringify(raw, null, 2)}

Respond ONLY with this JSON object:
{
  "background": "...",
  "goals": "...",
  "tone": "...",
  "roles": ["..."],
  "industries": ["..."],
  "emphasis": "..."
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 600,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('No content returned from LLM')

  const parsed = JSON.parse(content) as Partial<ExtractedSelfProfile>

  return {
    background: parsed.background ?? '',
    goals: parsed.goals ?? '',
    tone: parsed.tone ?? 'friendly and professional',
    roles: Array.isArray(parsed.roles) ? parsed.roles : [],
    industries: Array.isArray(parsed.industries) ? parsed.industries : [],
    emphasis: parsed.emphasis ?? '',
  }
}

export type GeneratedDraft = {
  draft_text: string
  personalization_note: string | null
}

export async function generateLinkedInDraft(
  userProfile: UserProfileContext,
  prospectContext: string
): Promise<GeneratedDraft> {
  const rolesAndIndustries = [
    ...(userProfile.roles ?? []),
    ...(userProfile.industries ?? []),
  ].join(', ')

  const systemPrompt = `You are an expert at writing personalized LinkedIn coffee chat messages. \
Your messages are concise (strictly under 300 characters), warm, genuine, and reference specific \
details from the recipient's actual background, never generic flattery. \
Never use em dashes (--) or any special punctuation; use only plain commas, periods, and spaces. \
Always respond with valid JSON only, no markdown.`

  const userPrompt = `Write a personalized LinkedIn coffee chat message from me to this person.

ABOUT ME:
- Background: ${userProfile.background ?? 'Not provided'}
- My goals: ${userProfile.goals ?? 'Not provided'}
- Tone: ${userProfile.tone ?? 'friendly and professional'}
- Target roles/industries: ${rolesAndIndustries || 'Not specified'}
- Details to emphasize: ${userProfile.emphasis ?? 'None'}

ABOUT THEM (full LinkedIn profile JSON):
${prospectContext}

Requirements:
1. The message must be strictly under 300 characters (count carefully)
2. FIRST, scan my background and their profile for any shared companies, organizations, schools, or projects. If any overlap exists, lead with that shared connection as the primary hook.
3. If no overlap exists, reference something specific and real from their profile (a company, school, role, or project)
4. Feel genuine and human, not copy-paste or templated
5. End with a clear but low-pressure ask for a quick chat or call
6. Never use em dashes (--) or special punctuation of any kind

Respond ONLY with this JSON object:
{
  "message": "the LinkedIn message text here",
  "personalization_note": "1-2 sentences explaining the personalization angle you used, and whether a shared connection was found"
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 500,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('No content returned from LLM')

  const parsed = JSON.parse(content) as { message?: string; personalization_note?: string }

  return {
    draft_text: parsed.message ?? '',
    personalization_note: parsed.personalization_note ?? null,
  }
}
