import { NextResponse } from 'next/server'
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from '@/lib/rate-limit'
import { recordAuditLog } from '@/lib/saas'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'

export const runtime = 'nodejs'

function getPriceId(plan: string) {
  if (plan === 'business') return process.env.STRIPE_BUSINESS_PRICE_ID?.trim()
  return process.env.STRIPE_PRO_PRICE_ID?.trim()
}

export async function POST(req: Request) {
  const { supabase, user, role, workspace } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' || !workspace?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = checkRateLimit(rateLimitKey(req, 'billing:checkout', user.id), {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  })

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many billing attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(limit) }
    )
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secretKey) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 })
  }

  const body = (await req.json().catch(() => null)) as { plan?: string } | null
  const plan = body?.plan === 'business' ? 'business' : 'pro'
  const priceId = getPriceId(plan)

  if (!priceId) {
    return NextResponse.json({ error: `${plan} billing price is not configured yet.` }, { status: 503 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(req.url).origin
  const params = new URLSearchParams({
    mode: 'subscription',
    success_url: `${origin}/admin/settings?billing=success`,
    cancel_url: `${origin}/admin/settings?billing=cancelled`,
    client_reference_id: workspace.id,
    'metadata[workspace_id]': workspace.id,
    'metadata[user_id]': user.id,
    'metadata[plan]': plan,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
  })

  if (user.email) {
    params.set('customer_email', user.email)
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const payload = (await response.json().catch(() => null)) as { url?: string; error?: { message?: string } } | null

  if (!response.ok || !payload?.url) {
    return NextResponse.json(
      { error: payload?.error?.message ?? 'Could not create billing checkout.' },
      { status: 502 }
    )
  }

  await recordAuditLog(supabase, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    action: 'billing.checkout_created',
    targetType: 'workspace',
    targetId: workspace.id,
    metadata: { plan },
  })

  return NextResponse.json({ url: payload.url })
}
