// @ts-nocheck
/* eslint-disable */
// Edge function runs in Deno runtime — not Node.js

const SYSTEM_PROMPT = `You are Parkly Assistant, the helpful AI chatbot for Parkly — a smart parking booking platform in India.

Your role:
- Help users find and book parking spots
- Answer questions about bookings, payments, slots, and the platform
- Guide hosts on listing their parking spaces and managing earnings
- Be friendly, concise, and helpful

Key knowledge about Parkly:
- Users can explore parking spots on a map, filter by price and amenities, and book by the hour
- Payments are handled via Stripe (card) and Razorpay (UPI/Indian methods) — all in INR (₹)
- Parking spots have real-time slot availability with visual slot maps (S/M/L sizes)
- Hosts can register parking spots, upload documents for verification, and track earnings
- Admins approve host applications and parking listings
- Reviews use a 5-star system and can be moderated
- Amenities include: CCTV, Covered Parking, EV Charging, 24/7 Access, Security Guard, Wheelchair Accessible, Well Lit, Near Transit
- Slot locking: when a user starts checkout, the slot is soft-locked for 60 seconds to prevent double-booking

Booking flow:
1. User selects date and time range
2. User picks an available slot from the visual grid
3. Slot gets locked for 60 seconds
4. User pays via Stripe/Razorpay
5. On success, booking is confirmed and slot is marked booked

If a user asks something you don't know or that requires account-specific data you can't access, suggest they check their dashboard or contact support.

Keep responses concise (2-4 sentences for simple questions, longer for complex ones). Use ₹ for currency. Don't use markdown headers — keep formatting simple with short paragraphs.`

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { messages, context } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Groq API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build context-aware system prompt
    let systemPrompt = SYSTEM_PROMPT
    if (context) {
      const parts: string[] = []
      if (context.userName) parts.push(`The user's name is ${context.userName}.`)
      if (context.userRole) parts.push(`Their role is: ${context.userRole}.`)
      if (context.currentPage) parts.push(`They are currently on the ${context.currentPage} page.`)
      if (parts.length > 0) {
        systemPrompt += `\n\nCurrent session context:\n${parts.join(' ')}`
      }
    }

    // Groq uses OpenAI-compatible format
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-20).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ]

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: apiMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const errMsg = data.error?.message || 'Groq request failed'
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
