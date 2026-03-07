import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type UserProfileContext = {
  background: string | null
  goals: string | null
  tone: string | null
  roles: string[] | null
  industries: string[] | null
  emphasis: string | null
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
details from the recipient's actual background — never generic flattery. \
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
2. Reference something specific and real from their profile (a company, school, role, or project)
3. Feel genuine and human, not copy-paste or templated
4. End with a clear but low-pressure ask for a quick chat or call

Respond ONLY with this JSON object:
{
  "message": "the LinkedIn message text here",
  "personalization_note": "1-2 sentences explaining the personalization angle you used"
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
