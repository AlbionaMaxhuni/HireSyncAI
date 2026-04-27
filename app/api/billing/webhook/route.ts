import { NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/lib/server-auth'

export const runtime = 'nodejs'

type StripeEvent = {
  type?: string
  data?: {
    object?: {
      id?: string
      customer?: string
      subscription?: string
      metadata?: Record<string, string | undefined>
    }
  }
}

function parseStripeSignature(value: string | null) {
  const parts = (value ?? '').split(',').reduce<Record<string, string>>((accumulator, part) => {
    const [key, signatureValue] = part.split('=')
    if (key && signatureValue) accumulator[key] = signatureValue
    return accumulator
  }, {})

  return {
    timestamp: parts.t,
    signature: parts.v1,
  }
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false

  let result = 0
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }

  return result === 0
}

async function verifyStripeSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) return false

  const { timestamp, signature } = parseStripeSignature(signatureHeader)
  if (!timestamp || !signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signedPayload = `${timestamp}.${rawBody}`
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))

  return timingSafeEqual(toHex(digest), signature)
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const verified = await verifyStripeSignature(rawBody, req.headers.get('stripe-signature'))

  if (!verified) {
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 401 })
  }

  const event = JSON.parse(rawBody) as StripeEvent
  const session = event.data?.object

  if (event.type === 'checkout.session.completed' && session?.metadata?.workspace_id) {
    const plan = session.metadata.plan === 'business' ? 'business' : 'pro'
    const supabase = createServerSupabaseAdminClient()

    await supabase
      .from('workspaces')
      .update({
        plan,
        subscription_status: 'active',
        stripe_customer_id: session.customer ?? null,
        stripe_subscription_id: session.subscription ?? null,
      })
      .eq('id', session.metadata.workspace_id)
  }

  return NextResponse.json({ received: true })
}
