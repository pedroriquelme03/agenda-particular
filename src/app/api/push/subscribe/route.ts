import { supabase } from "@/lib/supabase";
import { isPushConfigured, sendPush } from "@/lib/push";

interface SubscribeBody {
  subscription?: {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  // Send a confirmation notification right away.
  welcome?: boolean;
}

export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return Response.json(
      { error: "Notificações não configuradas." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as SubscribeBody | null;
  const endpoint = body?.subscription?.endpoint;
  const p256dh = body?.subscription?.keys?.p256dh;
  const auth = body?.subscription?.keys?.auth;
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
  ) {
    return Response.json({ error: "Inscrição inválida." }, { status: 400 });
  }

  const subscription = { endpoint, p256dh, auth };
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(subscription, { onConflict: "endpoint" });
  if (error) {
    console.error("Error saving push subscription:", error);
    return Response.json(
      { error: "Não foi possível ativar as notificações." },
      { status: 500 }
    );
  }

  if (body?.welcome) {
    await sendPush(subscription, {
      title: "Notificações ativadas",
      body: "Você será avisado 24h e 1h antes de compromissos e tarefas.",
      tag: "welcome",
    });
  }

  return Response.json({ ok: true });
}
