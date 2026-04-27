type RateLimitOptions = {
  limit: number
  windowMs: number
}

export type RateLimitResult = {
  ok: boolean
  limit: number
  remaining: number
  resetAt: number
}

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function now() {
  return Date.now()
}

export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  return forwardedFor || realIp || 'unknown'
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const currentTime = now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= currentTime) {
    const resetAt = currentTime + options.windowMs
    buckets.set(key, { count: 1, resetAt })

    return {
      ok: true,
      limit: options.limit,
      remaining: Math.max(options.limit - 1, 0),
      resetAt,
    }
  }

  existing.count += 1

  return {
    ok: existing.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(options.limit - existing.count, 0),
    resetAt: existing.resetAt,
  }
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
}

export function rateLimitKey(req: Request, scope: string, identity?: string | null) {
  return `${scope}:${identity || getClientIp(req)}`
}
