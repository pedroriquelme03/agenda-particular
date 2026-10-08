import { supabase } from "@/lib/supabase";
import { isPushConfigured, sendPush, type StoredSubscription } from "@/lib/push";

// Called every 5 minutes by a database cron job. Safe to call at any time:
// each reminder is recorded before it is sent, so repeats send nothing.
//
// It has to read every account's items, which row-level security forbids, so it
// goes through database functions that only answer to PUSH_CRON_SECRET.
export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;
// How late a reminder may still go out. Covers the 5-minute cron with slack.
const GRACE_MS = 20 * 60 * 1000;

const REMINDERS = [
  { kind: "24h", before: 24 * HOUR_MS, label: "em 24 horas" },
  { kind: "1h", before: HOUR_MS, label: "em 1 hora" },
] as const;

const TIME_ZONE = process.env.APP_TIME_ZONE || "America/Sao_Paulo";
// A task deadline without a time of day counts as due at this local time.
const TASK_DUE_TIME = "09:00:00";
const UTC_OFFSET = process.env.APP_UTC_OFFSET || "-03:00";

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
});

interface CronData {
  entries: {
    id: string;
    user_id: string;
    title: string | null;
    content: string;
    reminder_date: string;
  }[];
  tasks: {
    id: string;
    user_id: string;
    title: string;
    due_date: string;
    due_time: string | null;
  }[];
  meetings?: {
    id: string;
    user_id: string;
    title: string;
    meeting_date: string;
    meeting_time: string | null;
    mode: "online" | "in_person";
  }[];
  subscriptions: (StoredSubscription & { user_id: string })[];
}

interface DueItem {
  type: "entry" | "task" | "meeting";
  id: string;
  userId: string;
  kind: "24h" | "1h";
  targetAt: Date;
  title: string;
  body: string;
}

// A reminder is due from (start - before) until GRACE_MS after that.
function dueKinds(start: Date, now: number) {
  return REMINDERS.filter(({ before }) => {
    const sendAt = start.getTime() - before;
    return sendAt <= now && now < sendAt + GRACE_MS;
  });
}

export async function GET() {
  const secret = process.env.PUSH_CRON_SECRET;
  if (!isPushConfigured() || !secret) {
    return Response.json(
      { error: "Notificações não configuradas." },
      { status: 500 }
    );
  }

  const now = Date.now();
  // Deadlines are plain dates, so load a day on each side and compare in JS.
  const day = (offsetDays: number) =>
    new Date(now + offsetDays * 24 * HOUR_MS).toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc("push_cron_data", {
    p_secret: secret,
    p_from: new Date(now).toISOString(),
    p_to: new Date(now + 24 * HOUR_MS + GRACE_MS).toISOString(),
    p_date_from: day(-1),
    p_date_to: day(2),
  });
  if (error) {
    console.error("Error loading reminders:", error);
    return Response.json({ error: "Falha ao carregar avisos." }, { status: 500 });
  }
  const { entries, tasks, meetings = [], subscriptions } = data as CronData;

  const due: DueItem[] = [];

  for (const entry of entries) {
    const start = new Date(entry.reminder_date);
    for (const { kind, label } of dueKinds(start, now)) {
      due.push({
        type: "entry",
        id: entry.id,
        userId: entry.user_id,
        kind,
        targetAt: start,
        title: `Compromisso ${label}`,
        body: `${entry.title || entry.content || "Compromisso"} — ${dateTimeFormat.format(start)}`,
      });
    }
  }

  for (const task of tasks) {
    const start = new Date(
      `${task.due_date}T${task.due_time || TASK_DUE_TIME}${UTC_OFFSET}`
    );
    for (const { kind, label } of dueKinds(start, now)) {
      due.push({
        type: "task",
        id: task.id,
        userId: task.user_id,
        kind,
        targetAt: start,
        title: `Tarefa vence ${label}`,
        body: `${task.title} — prazo ${(task.due_time ? dateTimeFormat : dateFormat).format(start)}`,
      });
    }
  }

  // Like a task deadline: a meeting without a time counts as TASK_DUE_TIME.
  for (const meeting of meetings) {
    const start = new Date(
      `${meeting.meeting_date}T${meeting.meeting_time || TASK_DUE_TIME}${UTC_OFFSET}`
    );
    for (const { kind, label } of dueKinds(start, now)) {
      due.push({
        type: "meeting",
        id: meeting.id,
        userId: meeting.user_id,
        kind,
        targetAt: start,
        title: `Reunião ${label}`,
        body: `${meeting.title} — ${(meeting.meeting_time ? dateTimeFormat : dateFormat).format(start)} · ${meeting.mode === "online" ? "online" : "presencial"}`,
      });
    }
  }

  let sent = 0;
  for (const item of due) {
    // Recording first makes the insert the lock: false means another run
    // already handled this reminder.
    const { data: isNew, error: markError } = await supabase.rpc(
      "push_cron_mark_sent",
      {
        p_secret: secret,
        p_item_type: item.type,
        p_item_id: item.id,
        p_kind: item.kind,
        p_target_at: item.targetAt.toISOString(),
      }
    );
    if (markError) {
      console.error("Error recording reminder:", markError);
      continue;
    }
    if (!isNew) continue;

    // Each reminder goes only to its owner's devices.
    await Promise.all(
      subscriptions
        .filter((subscription) => subscription.user_id === item.userId)
        .map(async (subscription) => {
          const result = await sendPush(subscription, {
            title: item.title,
            body: item.body,
            tag: `${item.type}-${item.id}-${item.kind}`,
          });
          if (result === "gone") {
            await supabase.rpc("push_cron_remove_subscription", {
              p_secret: secret,
              p_endpoint: subscription.endpoint,
            });
          }
        })
    );
    sent += 1;
  }

  return Response.json({ due: due.length, sent });
}
