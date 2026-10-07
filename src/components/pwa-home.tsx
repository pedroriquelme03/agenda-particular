"use client";

import { useCallback, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarPlus,
  ChevronLeft,
  Link2,
  ListTodo,
  LogOut,
  Mic,
  NotebookPen,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OfflineBanner, useVisibleArea } from "@/components/pwa";
import { NotificationsButton } from "@/components/notifications-button";
import { CategoryPicker } from "@/components/category-picker";
import type { CategoriesState } from "@/hooks/use-categories";
import { useDictation } from "@/hooks/use-dictation";
import type { Entry, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type CreateEntry = (
  entry: Omit<Entry, "id" | "created_at" | "updated_at">
) => Promise<Entry | null>;

type Screen = "home" | "note" | "appointment";

interface PwaHomeProps {
  // Name given at sign-up; accounts created before that have none.
  userName?: string;
  entries: Entry[];
  tasks: Task[];
  categories: CategoriesState;
  createEntry: CreateEntry;
  onOpenLinks: () => void;
  onOpenTasks: () => void;
  onSignOut: () => void;
  nav: React.ReactNode;
}

const homeButton =
  "flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-3xl shadow-sm transition-transform active:scale-95";

export function PwaHome({
  userName,
  entries,
  tasks,
  categories,
  createEntry,
  onOpenLinks,
  onOpenTasks,
  onSignOut,
  nav,
}: PwaHomeProps) {
  const [screen, setScreen] = useState<Screen>("home");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const backHome = (message?: string) => {
    setSavedMessage(message ?? null);
    setScreen("home");
  };

  if (screen === "note") {
    return (
      <NoteScreen
        createEntry={createEntry}
        onCancel={() => backHome()}
        onSaved={() => backHome("Anotação salva.")}
      />
    );
  }

  if (screen === "appointment") {
    return (
      <AppointmentScreen
        categories={categories}
        createEntry={createEntry}
        onCancel={() => backHome()}
        onSaved={() => backHome("Compromisso salvo.")}
      />
    );
  }

  const today = new Date();
  // What is on for today: appointments and task deadlines, in time order.
  // A deadline without a time of day comes first.
  const todayItems = [
    ...entries
      .filter(
        (entry) =>
          entry.is_reminder &&
          !!entry.reminder_date &&
          !entry.archived_at &&
          isSameDay(new Date(entry.reminder_date), today)
      )
      .map((entry) => {
        const start = new Date(entry.reminder_date!);
        return {
          id: entry.id,
          kind: "Compromisso",
          sortKey: start.getTime(),
          time:
            format(start, "HH:mm") +
            (entry.reminder_end_date
              ? " – " + format(new Date(entry.reminder_end_date), "HH:mm")
              : ""),
          title: entry.title || "Compromisso",
          detail: entry.content,
          done: !!entry.completed_at,
        };
      }),
    ...tasks
      .filter(
        (task) =>
          !!task.due_date &&
          !task.archived_at &&
          isSameDay(new Date(task.due_date + "T00:00"), today)
      )
      .map((task) => ({
        id: task.id,
        kind: "Tarefa",
        sortKey: new Date(
          task.due_date + "T" + (task.due_time || "00:00")
        ).getTime(),
        time: task.due_time ? task.due_time.slice(0, 5) : "Hoje",
        title: task.title,
        detail: task.project || task.description,
        done: !!task.completed_at,
      })),
  ].sort((x, y) => x.sortKey - y.sortKey);

  return (
    <div className="flex h-full w-full flex-col">
      <OfflineBanner />
      <header className="flex items-start justify-between gap-3 px-5 pt-8 pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {userName ? `Olá ${userName.trim().split(/s+/)[0]}` : "Minha Agenda"}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <NotificationsButton />
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col px-5">
        <h2 className="pb-2 text-sm font-semibold text-muted-foreground">
          Hoje
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {todayItems.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              Nenhum compromisso ou tarefa hoje.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {todayItems.map((item) => (
                <li
                  key={item.kind + item.id}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5",
                    item.done && "opacity-50"
                  )}
                >
                  <span className="w-[5.5rem] shrink-0 text-sm font-semibold tabular-nums">
                    {item.time}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-medium",
                        item.done && "line-through"
                      )}
                    >
                      {item.title}
                    </span>
                    {item.detail && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.detail}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      item.kind === "Tarefa"
                        ? "border-foreground bg-foreground text-background"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.kind}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <main className="px-5 pt-3 pb-5">
        {savedMessage && (
          <p className="mb-3 text-center text-sm text-muted-foreground">
            {savedMessage}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setScreen("note")}
            className={cn(homeButton, "bg-primary text-primary-foreground")}
          >
            <NotebookPen className="h-9 w-9" />
            <span className="text-base font-semibold">Anotação</span>
          </button>
          <button
            onClick={() => setScreen("appointment")}
            className={cn(homeButton, "border bg-secondary text-secondary-foreground")}
          >
            <CalendarPlus className="h-9 w-9" />
            <span className="text-base font-semibold">Compromisso</span>
          </button>
          <button
            onClick={onOpenLinks}
            className={cn(homeButton, "border bg-secondary text-secondary-foreground")}
          >
            <Link2 className="h-9 w-9" />
            <span className="text-base font-semibold">Links</span>
          </button>
          <button
            onClick={onOpenTasks}
            className={cn(homeButton, "border bg-secondary text-secondary-foreground")}
          >
            <ListTodo className="h-9 w-9" />
            <span className="text-base font-semibold">Tarefas</span>
          </button>
        </div>
      </main>

      {nav}
    </div>
  );
}

interface ScreenProps {
  createEntry: CreateEntry;
  onCancel: () => void;
  onSaved: () => void;
}

export function NoteScreen({
  createEntry,
  onCancel,
  onSaved,
  editing,
}: ScreenProps & {
  // Given to change an existing text instead of creating a note.
  editing?: {
    content: string;
    // A link's note can be cleared; a note of its own cannot be left empty.
    allowEmpty?: boolean;
    save: (content: string) => Promise<boolean>;
  };
}) {
  const [content, setContent] = useState(editing?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [openedAt] = useState(() => new Date());

  const appendPhrase = useCallback((text: string) => {
    setContent((prev) => {
      if (!prev || prev.endsWith("\n")) return prev + text;
      return `${prev.trimEnd()} ${text}`;
    });
  }, []);

  const dictation = useDictation(appendPhrase);
  const visibleArea = useVisibleArea();

  const isEmpty = !content.trim() && !editing?.allowEmpty;

  const handleSave = async () => {
    if (isEmpty) return;
    setSaving(true);
    setSaveError(false);
    if (editing) {
      const saved = await editing.save(content.trim());
      setSaving(false);
      if (saved) onSaved();
      else setSaveError(true);
      return;
    }
    const entry = await createEntry({
      type: "text",
      title: null,
      content: content.trim(),
      image_url: null,
      audio_url: null,
      link_url: null,
      trello_card_id: null,
      is_reminder: false,
      reminder_date: null,
      tags: [],
    });
    setSaving(false);
    if (entry) onSaved();
    else setSaveError(true);
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex h-full flex-col bg-background"
      style={
        visibleArea.height
          ? { height: visibleArea.height, top: visibleArea.top }
          : undefined
      }
    >
      <header className="flex items-center justify-between px-2 pt-3 pb-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-0.5 px-2 py-2 text-base text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
          Voltar
        </button>
        <button
          onClick={handleSave}
          disabled={
            saving ||
            isEmpty ||
            dictation.isListening ||
            dictation.isTranscribing
          }
          className="px-3 py-2 text-base font-semibold text-foreground disabled:opacity-40"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </header>

      <p className="text-center text-xs text-muted-foreground">
        {format(openedAt, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
      </p>

      <textarea
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Anotação"
        className="flex-1 w-full resize-none bg-transparent px-5 py-3 text-lg leading-relaxed outline-none placeholder:text-muted-foreground/60"
      />

      <footer className="flex flex-row-reverse items-center gap-3 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          // Keeps focus in the note so the keyboard does not close on tap.
          onMouseDown={(e) => e.preventDefault()}
          onClick={dictation.isListening ? dictation.stop : dictation.start}
          disabled={!dictation.isSupported || dictation.isTranscribing}
          aria-label={dictation.isListening ? "Parar gravação" : "Gravar áudio"}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
            dictation.isListening
              ? "bg-foreground text-background animate-pulse"
              : "bg-muted text-foreground"
          )}
        >
          {dictation.isListening ? (
            <Square className="h-5 w-5 fill-current" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </button>
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          {saveError
            ? "Não foi possível salvar. Tente de novo."
            : !dictation.isSupported
              ? "Ditado por voz não disponível neste aparelho."
              : dictation.isListening
                ? "Gravando... toque para parar e transcrever."
                : dictation.isTranscribing
                  ? "Transcrevendo..."
                  : (dictation.error ?? "")}
        </p>
      </footer>
    </div>
  );
}

function AppointmentScreen({
  categories,
  createEntry,
  onCancel,
  onSaved,
}: ScreenProps & { categories: CategoriesState }) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const visibleArea = useVisibleArea();

  // "HH:mm" strings compare correctly as text.
  const endBeforeStart = !!endTime && !!time && endTime <= time;
  const canSave = title.trim() && date && time && !endBeforeStart && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setSaveError(false);
    const entry = await createEntry({
      type: "text",
      title: title.trim(),
      content: location.trim() ? `Local: ${location.trim()}` : "",
      image_url: null,
      audio_url: null,
      link_url: null,
      trello_card_id: null,
      is_reminder: true,
      reminder_date: new Date(`${date}T${time}`).toISOString(),
      reminder_end_date: endTime
        ? new Date(`${date}T${endTime}`).toISOString()
        : null,
      tags: ["compromisso"],
      category_id: categoryId,
    });
    setSaving(false);
    if (entry) onSaved();
    else setSaveError(true);
  };

  return (
    <div
      className="fixed inset-x-0 top-0 flex h-full flex-col bg-background"
      style={
        visibleArea.height
          ? { height: visibleArea.height, top: visibleArea.top }
          : undefined
      }
    >
      <header className="flex items-center gap-1 border-b px-2 py-3">
        <button
          onClick={onCancel}
          aria-label="Voltar"
          className="p-2 text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">Novo compromisso</h2>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex-1 space-y-5 overflow-y-auto px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="space-y-2">
          <Label htmlFor="appointment-title">Título</Label>
          <Input
            id="appointment-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Reunião com cliente"
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="appointment-date">Data</Label>
            <Input
              id="appointment-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block h-12 appearance-none text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appointment-time">Hora de início</Label>
            <Input
              id="appointment-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="block h-12 appearance-none text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appointment-end">Hora de término (opcional)</Label>
            <Input
              id="appointment-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="block h-12 appearance-none text-base"
            />
            {endBeforeStart && (
              <p className="text-sm text-destructive">
                O término precisa ser depois do início.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="appointment-location">Local</Label>
          <Input
            id="appointment-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex.: Escritório"
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <CategoryPicker
            state={categories}
            value={categoryId}
            onChange={setCategoryId}
          />
        </div>

        {saveError && (
          <p className="text-sm text-destructive">
            Não foi possível salvar. Tente de novo.
          </p>
        )}

        <Button type="submit" disabled={!canSave} className="h-12 w-full text-base">
          {saving ? "Salvando..." : "Salvar compromisso"}
        </Button>
      </form>
    </div>
  );
}
