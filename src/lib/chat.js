import { insforge } from './insforge'

export async function sendChatMessage(messages, context = {}) {
  const body = { messages, context }

  // Try SDK invoke first
  try {
    const { data, error } = await insforge.functions.invoke('parkly-chat', { body })
    if (!error && data?.reply) return data.reply
  } catch (e) {
    console.warn('SDK invoke failed, trying direct fetch:', e)
  }

  // Fallback: direct fetch to functions URL
  const baseUrl = import.meta.env.VITE_INSFORGE_URL
  const appKey = new URL(baseUrl).hostname.split('.')[0]
  const functionsUrl = `https://${appKey}.functions.insforge.app/parkly-chat`

  const res = await fetch(functionsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Chat request failed')
  }

  const data = await res.json()
  return data.reply
}
