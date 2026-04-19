const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY

/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {{ maxTokens?: number }} [options]
 */
export async function callAI(systemPrompt, userPrompt, options = {}) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Missing VITE_OPENROUTER_API_KEY')
  }

  const maxTokens = Number.isFinite(options.maxTokens) ? options.maxTokens : 4096

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg = data?.error?.message || response.statusText || 'OpenRouter request failed'
    throw new Error(msg)
  }

  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('Invalid OpenRouter response')
  }
  return content
}
