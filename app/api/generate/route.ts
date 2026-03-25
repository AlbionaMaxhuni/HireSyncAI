import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name)
          return cookie?.value
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

  try {
    const body = await req.json()
    const title = String(body?.title ?? '').trim()

    if (!title) {
      return NextResponse.json(
        { error: 'Titulli/pozita mungon. Dërgo { title: string }.' },
        { status: 400 }
      )
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY mungon në environment.' },
        { status: 500 }
      )
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `Je një rekrutues profesional. Gjenero 5 pyetje specifike për intervistë teknike për pozitën: ${title}. Përgjigju vetëm me pyetjet e numeruara.`,
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('OpenRouter Error Data:', data)
      throw new Error(data?.error?.message || 'Gabim nga OpenRouter')
    }

    const questions = data?.choices?.[0]?.message?.content

    if (!questions) {
      return NextResponse.json(
        { error: 'OpenRouter nuk ktheu përmbajtje (choices[0].message.content).' },
        { status: 502 }
      )
    }

    return NextResponse.json({ questions })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Dështoi gjenerimi i pyetjeve.' },
      { status: 500 }
    )
  }
}