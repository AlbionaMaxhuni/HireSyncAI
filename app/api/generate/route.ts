import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title } = await req.json();

    // 1. Marrim API Key nga .env.local
    // Sigurohu që në .env.local e ke emrin OPENROUTER_API_KEY
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("GABIM: API Key nuk u gjet në .env.local");
      return NextResponse.json(
        { error: "API Key mungon. Kontrollo skedarin .env.local" },
        { status: 500 }
      );
    }

    // 2. Thirrja e OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000", // Opsionale
      },
      body: JSON.stringify({
        "model": "openrouter/auto",
        "messages": [
          {
            "role": "user",
            "content": `Ti je një rekrutues profesional. Bazuar në titullin e punës: "${title}", gjenero vetëm 5 pyetje specifike për intervistë. Përgjigju vetëm me listën e pyetjeve pa tekst tjetër shtesë.`
          }
        ]
      })
    });

    const data = await response.json();

    // 3. Kontrolli i përgjigjes
    if (!response.ok) {
      console.error("OpenRouter Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Gabim nga OpenRouter" },
        { status: response.status }
      );
    }

    const aiText = data.choices[0]?.message?.content || "Nuk u gjenerua asnjë tekst.";

    return NextResponse.json({ questions: aiText });

  } catch (error: any) {
    console.error("GABIM KRITIK:", error.message);
    return NextResponse.json(
      { error: "Gabim teknik: " + error.message },
      { status: 500 }
    );
  }
}