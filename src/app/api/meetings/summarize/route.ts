import { getRequestUser } from "@/lib/supabase-server";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const MAX_NOTES_LENGTH = 30000;

const INSTRUCTIONS =
  "Você recebe as anotações soltas que uma pessoa fez durante uma reunião. " +
  "Escreva, em português do Brasil, duas partes:\n" +
  "1. Um resumo detalhado da reunião, organizando o que foi anotado em texto claro.\n" +
  "2. O que a pessoa precisa fazer a partir dali, como uma lista de ações.\n\n" +
  "Formato: texto simples, sem markdown e sem asteriscos. Use exatamente os títulos " +
  "\"Resumo\" e \"O que preciso fazer\", cada um em uma linha própria. Na lista, " +
  "comece cada item com \"- \". Use somente o que está nas anotações: não invente " +
  "decisões, prazos ou nomes. Se as anotações não indicarem nenhuma ação, diga isso " +
  "na segunda parte.";

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export async function POST(request: Request) {
  if (!(await getRequestUser(request))) {
    return Response.json({ error: "Faça login para continuar." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Resumo não configurado (GEMINI_API_KEY ausente)." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    notes?: unknown;
  } | null;
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!notes) {
    return Response.json(
      { error: "Escreva as anotações antes de gerar o resumo." },
      { status: 400 }
    );
  }
  if (notes.length > MAX_NOTES_LENGTH) {
    return Response.json({ error: "Anotações longas demais." }, { status: 413 });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: INSTRUCTIONS },
              { text: `Reunião: ${title || "(sem título)"}\n\nAnotações:\n${notes}` },
            ],
          },
        ],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );

  if (!response.ok) {
    console.error(
      "Gemini summary error:",
      response.status,
      await response.text().catch(() => "")
    );
    return Response.json(
      { error: "Não foi possível gerar o resumo." },
      { status: 502 }
    );
  }

  const data = (await response.json()) as GeminiResponse;
  const summary = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!summary) {
    return Response.json(
      { error: "Não foi possível gerar o resumo." },
      { status: 502 }
    );
  }

  return Response.json({ summary });
}
