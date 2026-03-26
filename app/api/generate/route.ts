import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'edge' // streaming works best on edge

export async function POST(req: Request) {
  const cookieStore = await cookies()

  // 1) Supabase server auth (protected route)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized: Ju lutem kyçuni.' }, { status: 401 })
  }

  // 2) Validate input
  const body = await req.json().catch(() => null)
  const title = String(body?.title ?? '').trim()

  if (!title) {
    return NextResponse.json(
      { error: 'Titulli/pozita mungon. Dërgo { title: string }.' },
      { status: 400 }
    )
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY mungon në environment.' }, { status: 500 })
  }

  // 3) Ask OpenRouter for streaming SSE
  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      // Optional but recommended by OpenRouter:
      // 'HTTP-Referer': 'http://localhost:3000',
      // 'X-Title': 'HireSyncAI',
    },
    body: JSON.stringify({
      // pick one:
      // model: 'google/gemini-2.0-flash',
      model: 'openai/gpt-3.5-turbo',
      stream: true,
      messages: [
        {
          role: 'system',
          content:
            'Je një rekrutues profesional. Përgjigju vetëm me 5 pyetje të numeruara (pa shpjegime).',
        },
        {
          role: 'user',
          content: `Gjenero 5 pyetje specifike për intervistë teknike për pozitën: ${title}.`,
        },
      ],
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '')
    return NextResponse.json(
      { error: `OpenRouter error (${upstream.status}): ${errText || 'Unknown error'}` },
      { status: 502 }
    )
  }

  // 4) Return SSE stream as-is to the browser
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}