import { getRequestUser } from "@/lib/supabase-server";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Stays under the 4.5 MB request limit of the hosting platform.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

const PROMPT =
  "Transcreva este áudio em português do Brasil. Responda somente com o texto falado, " +
  "com pontuação, sem comentários nem aspas. Se não houver fala, responda com nada.";

// Transcribing needs no reasoning; the default thinking level only adds delay.
const FAST_CONFIG = { temperature: 0, thinkingConfig: { thinkingLevel: "low" } };
const PLAIN_CONFIG = { temperature: 0 };

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
      { error: "Transcrição não configurada (GEMINI_API_KEY ausente)." },
      { status: 500 }
    );
  }

  // "audio/mp4;codecs=mp4a.40.2" -> "audio/mp4"
  const mimeType = (request.headers.get("content-type") || "")
    .split(";")[0]
    .trim();
  if (!mimeType.startsWith("audio/")) {
    return Response.json({ error: "Envie um arquivo de áudio." }, { status: 400 });
  }

  const audio = Buffer.from(await request.arrayBuffer());
  if (audio.length === 0) {
    return Response.json({ error: "Áudio vazio." }, { status: 400 });
  }
  if (audio.length > MAX_AUDIO_BYTES) {
    return Response.json({ error: "Áudio longo demais." }, { status: 413 });
  }

  const contents = [
    {
      parts: [
        { text: PROMPT },
        { inline_data: { mime_type: mimeType, data: audio.toString("base64") } },
      ],
    },
  ];
  const generate = (generationConfig: object) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({ contents, generationConfig }),
      }
    );

  let response = await generate(FAST_CONFIG);
  // A model that rejects the thinking setting still transcribes without it.
  if (response.status === 400) response = await generate(PLAIN_CONFIG);

  if (!response.ok) {
    console.error(
      "Gemini transcription error:",
      response.status,
      await response.text().catch(() => "")
    );
    return Response.json(
      { error: "Não foi possível transcrever o áudio." },
      { status: 502 }
    );
  }

  const data = (await response.json()) as GeminiResponse;
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  return Response.json({ text });
}
