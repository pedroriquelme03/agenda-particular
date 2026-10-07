import { supabase } from "@/lib/supabase";
import { isPushConfigured, sendPushToAll } from "@/lib/push";

// Called every 5 minutes by a database cron job. Safe to call at any time:
// each reminder is recorded before it is sent, so repeats send nothing.
export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;
// How late a reminder may still go out. Covers the 5-minute cron with slack.
const GRACE_MS = 20 * 60 * 1000;

const REMINDERS = [
  { kind: "24h", before: 24 * HOUR_MS, label: "em 24 horas" },
  { kind: "1h", before: HOUR_MS, label: "em 1 hora" },
] as const;

const TIME_ZONE = process.env.APP_TIME_ZONE || "America/Sao_Paulo";
// Tasks only have a deadline day; they count as due at this local time.
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

interface DueItem {
  type: "entry" | "task";
  id: string;
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
  if (!isPushConfigured()) {
    return Response.json(
      { error: "Notificações não configuradas." },
      { status: 500 }
    );
  }

  const now = Date.now();
  const horizon = new Date(now + 24 * HOUR_MS + GRACE_MS).toISOString();
  const due: DueItem[] = [];

  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select("id, title, content, reminder_date")
    .eq("is_reminder", true)
    .is("completed_at", null)
    .gt("reminder_date", new Date(now).toISOString())
    .lte("reminder_date", horizon);
  if (entriesError) console.error("Error loading appointments:", entriesError);

  for (const entry of entries ?? []) {
    const start = new Date(entry.reminder_date);
    for (const { kind, label } of dueKinds(start, now)) {
      due.push({
        type: "entry",
        id: entry.id,
        kind,
        targetAt: start,
        title: `Compromisso ${label}`,
        body: `${entry.title || entry.content || "Compromisso"} — ${dateTimeFormat.format(start)}`,
      });
    }
  }

  // Deadlines are plain dates, so load a day on each side and compare in JS.
  const day = (offsetDays: number) =>
    new Date(now + offsetDays * 24 * HOUR_MS).toISOString().slice(0, 10);
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, due_date")
    .is("completed_at", null)
    .gte("due_date", day(-1))
    .lte("due_date", day(2));
  if (tasksError) console.error("Error loading tasks:", tasksError);

  for (const task of tasks ?? []) {
    const start = new Date(`${task.due_date}T${TASK_DUE_TIME}${UTC_OFFSET}`);
    for (const { kind, label } of dueKinds(start, now)) {
      due.push({
        type: "task",
        id: task.id,
        kind,
        targetAt: start,
        title: `Tarefa vence ${label}`,
        body: `${task.title} — prazo ${dateFormat.format(start)}`,
      });
    }
  }

  let sent = 0;
  for (const item of due) {
    // Recording first makes the insert the lock: a duplicate key means another
    // run already handled this reminder.
    const { error } = await supabase.from("push_sent").insert({
      item_type: item.type,
      item_id: item.id,
      kind: item.kind,
      target_at: item.targetAt.toISOString(),
    });
    if (error) {
      if (error.code !== "23505") console.error("Error recording reminder:", error);
      continue;
    }
    await sendPushToAll({
      title: item.title,
      body: item.body,
      tag: `${item.type}-${item.id}-${item.kind}`,
    });
    sent += 1;
  }

  return Response.json({ due: due.length, sent });
}
