import { getRequestUser } from "@/lib/supabase-server";
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

  const session = await getRequestUser(request);
  if (!session) {
    return Response.json({ error: "Faça login para continuar." }, { status: 401 });
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

  // The function also moves a device to this account if someone else used it before.
  const { error } = await session.client.rpc("register_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
  });
  if (error) {
    console.error("Error saving push subscription:", error);
    return Response.json(
      { error: "Não foi possível ativar as notificações." },
      { status: 500 }
    );
  }

  if (body?.welcome) {
    const result = await sendPush(
      { endpoint, p256dh, auth },
      {
        title: "Notificações ativadas",
        body: "Você será avisado 24h e 1h antes de compromissos e tarefas.",
        tag: "welcome",
      }
    );
    if (result === "gone") {
      await session.client
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint);
    }
  }

  return Response.json({ ok: true });
}
