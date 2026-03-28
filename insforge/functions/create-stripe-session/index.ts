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
    const { booking_id, amount, parking_title, customer_email, success_url, cancel_url } = await req.json()

    if (!booking_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'booking_id and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Stripe Checkout Session via REST API
    const params = new URLSearchParams()
    params.append('mode', 'payment')
    params.append('payment_method_types[0]', 'card')
    params.append('line_items[0][price_data][currency]', 'inr')
    params.append('line_items[0][price_data][unit_amount]', Math.round(amount * 100).toString())
    params.append('line_items[0][price_data][product_data][name]', parking_title || 'Parking Booking')
    params.append('line_items[0][price_data][product_data][description]', `Booking ID: ${booking_id}`)
    params.append('line_items[0][quantity]', '1')
    params.append('customer_email', customer_email || '')
    params.append('success_url', success_url)
    params.append('cancel_url', cancel_url)
    params.append('metadata[booking_id]', booking_id)

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message || 'Failed to create session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        session_id: session.id,
        url: session.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
