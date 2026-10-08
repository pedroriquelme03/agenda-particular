"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { FilterBar, passesFilters, useListFilters } from "@/components/filter-bar";
import { SwipeToArchive } from "@/components/swipe-to-archive";
import { Toast, type ToastMessage } from "@/components/toast";
import { useVisibleArea } from "@/components/pwa";
import type { MeetingInput, MeetingsState } from "@/hooks/use-meetings";
import { authHeader } from "@/lib/supabase";
import type { Meeting, MeetingMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export const meetingModeLabels: Record<MeetingMode, string> = {
  online: "Online",
  in_person: "Presencial",
};

const whenOf = (meeting: Meeting) =>
  new Date(`${meeting.meeting_date}T${meeting.meeting_time || "23:59"}`).getTime();

function whenLabel(meeting: Meeting) {
  const date = format(parseISO(meeting.meeting_date), "dd/MM/yyyy");
  return meeting.meeting_time
    ? `${date} às ${meeting.meeting_time.slice(0, 5)}`
    : date;
}

// The meeting list is owned by the page, which also shows it in the calendar.
export function MeetingsView({
  meetings,
  loading,
  createMeeting,
  updateMeeting,
  deleteMeeting,
}: MeetingsState) {
  // Split by day. "date": the meeting day, nearest first. "added": the day it
  // was registered, latest first.
  const filters = useListFilters("date");
  const [formOpen, setFormOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Looked up from the list so the open meeting reflects every change made to it.
  const openMeeting = meetings.find((meeting) => meeting.id === openId) ?? null;

  const filtered = meetings.filter((meeting) =>
    passesFilters(filters, {
      done: !!meeting.completed_at,
      archived: !!meeting.archived_at,
    })
  );
  // Meetings arrive ordered by when they were added.
  const visible =
    filters.sortBy === "date"
      ? [...filtered].sort((a, b) => whenOf(a) - whenOf(b))
      : filtered;

  // Consecutive meetings of the same day share a title such as "Quarta-feira 07/10".
  const dayKey = (meeting: Meeting) =>
    filters.sortBy === "date"
      ? meeting.meeting_date
      : format(new Date(meeting.created_at), "yyyy-MM-dd");
  const groups: { key: string; meetings: Meeting[] }[] = [];
  for (const meeting of visible) {
    const key = dayKey(meeting);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.meetings.push(meeting);
    else groups.push({ key, meetings: [meeting] });
  }

  const toggleDone = (meeting: Meeting) => {
    const done = !meeting.completed_at;
    updateMeeting(meeting.id, {
      completed_at: done ? new Date().toISOString() : null,
    });
    setToast({
      id: Date.now(),
      text: done ? "Reunião concluída" : "Reunião reaberta",
      ...(done && {
        actionLabel: "Desfazer",
        onAction: () => {
          updateMeeting(meeting.id, { completed_at: null });
          setToast(null);
        },
      }),
    });
  };

  const toggleArchived = (meeting: Meeting) => {
    const archive = !meeting.archived_at;
    updateMeeting(meeting.id, {
      archived_at: archive ? new Date().toISOString() : null,
    });
    setToast({
      id: Date.now(),
      text: archive ? "Reunião arquivada" : "Reunião desarquivada",
      ...(archive && {
        actionLabel: "Desfazer",
        onAction: () => {
          updateMeeting(meeting.id, { archived_at: null });
          setToast(null);
        },
      }),
    });
  };

  const confirmDelete = async () => {
    const meeting = deleteTarget;
    setDeleteTarget(null);
    if (meeting && (await deleteMeeting(meeting.id))) {
      setToast({ id: Date.now(), text: "Reunião apagada" });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
          <FilterBar
            filters={filters}
            doneLabel="Concluídas"
            archivedLabel="Arquivadas"
          />

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando...</div>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {filters.showArchived
                ? "Nenhuma reunião arquivada."
                : filters.showDone
                  ? "Nenhuma reunião concluída."
                  : "Nenhuma reunião ainda."}
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <section key={group.key} className="space-y-2">
                  <h3 className="text-sm font-semibold first-letter:uppercase">
                    {format(parseISO(group.key), "EEEE dd/MM", { locale: ptBR })}
                  </h3>
                  {group.meetings.map((meeting) => (
                    <SwipeToArchive
                      key={meeting.id}
                      archived={!!meeting.archived_at}
                      onArchive={() => toggleArchived(meeting)}
                    >
                      <MeetingCard
                        meeting={meeting}
                        onOpen={() => setOpenId(meeting.id)}
                        onToggleDone={() => toggleDone(meeting)}
                        onDelete={() => setDeleteTarget(meeting)}
                      />
                    </SwipeToArchive>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t px-4 py-3">
        <Button
          onClick={() => setFormOpen(true)}
          className="mx-auto flex h-12 w-full max-w-2xl text-base"
        >
          <Plus className="h-4 w-4" />
          Nova reunião
        </Button>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova reunião</DialogTitle>
          </DialogHeader>
          <MeetingForm
            onSubmit={async (input) => {
              const meeting = await createMeeting(input);
              if (meeting) setFormOpen(false);
              return !!meeting;
            }}
          />
        </DialogContent>
      </Dialog>

      {openMeeting && (
        <MeetingScreen
          key={openMeeting.id}
          meeting={openMeeting}
          onSave={(updates) => updateMeeting(openMeeting.id, updates)}
          onClose={() => setOpenId(null)}
        />
      )}

      <ConfirmDelete
        label={deleteTarget ? deleteTarget.title : null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <Toast
        toast={toast}
        onDismiss={(id) =>
          setToast((current) => (current?.id === id ? null : current))
        }
      />
    </div>
  );
}

function MeetingCard({
  meeting,
  onOpen,
  onToggleDone,
  onDelete,
}: {
  meeting: Meeting;
  onOpen: () => void;
  onToggleDone: () => void;
  onDelete: () => void;
}) {
  const done = !!meeting.completed_at;
  const ModeIcon = meeting.mode === "online" ? Video : MapPin;

  return (
    <div className={cn("rounded-lg border bg-card p-3 sm:p-4", done && "opacity-60")}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggleDone}
          aria-label={done ? "Desmarcar como feita" : "Marcar como feita"}
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            done
              ? "border-foreground bg-foreground text-background"
              : "border-muted-foreground/50"
          )}
        >
          {done && <Check className="h-3.5 w-3.5" />}
        </button>

        {/* The body opens the meeting, where the notes are. */}
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <h4
            className={cn(
              "text-sm font-semibold sm:text-base",
              done && "text-muted-foreground line-through"
            )}
          >
            {meeting.title}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {whenLabel(meeting)}
            </span>
            <span className="flex items-center gap-1">
              <ModeIcon className="h-3.5 w-3.5" />
              {meetingModeLabels[meeting.mode]}
            </span>
            {meeting.notes && <span>Com anotações</span>}
            {meeting.summary && <span>Com resumo</span>}
          </div>
        </button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          aria-label="Excluir reunião"
          className="shrink-0 text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function MeetingForm({
  onSubmit,
}: {
  onSubmit: (input: MeetingInput) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [mode, setMode] = useState<MeetingMode>("online");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const canSave = !!title.trim() && !!date && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setSaveError(false);
    const saved = await onSubmit({
      title: title.trim(),
      meeting_date: date,
      meeting_time: time || null,
      mode,
    });
    setSaving(false);
    if (!saved) setSaveError(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="meeting-title">Título</Label>
        <Input
          id="meeting-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Alinhamento com o cliente"
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="meeting-date">Data</Label>
        <Input
          id="meeting-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="block h-12 appearance-none text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="meeting-time">Hora</Label>
        <Input
          id="meeting-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="block h-12 appearance-none text-base"
        />
      </div>

      <div className="space-y-2">
        <Label>Formato</Label>
        <div className="flex gap-1 rounded-lg border p-1">
          {(["online", "in_person"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                mode === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              {meetingModeLabels[value]}
            </button>
          ))}
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-destructive">
          Não foi possível salvar. Tente de novo.
        </p>
      )}

      <Button type="submit" disabled={!canSave} className="h-12 w-full text-base">
        {saving ? "Salvando..." : "Salvar reunião"}
      </Button>
    </form>
  );
}

// The meeting open on the whole screen: its notes, written as it happens, and
// the summary the assistant writes from them.
function MeetingScreen({
  meeting,
  onSave,
  onClose,
}: {
  meeting: Meeting;
  onSave: (updates: Partial<Meeting>) => Promise<Meeting | null>;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(meeting.notes);
  const [summarizing, setSummarizing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const visibleArea = useVisibleArea();

  const dirty = notes !== meeting.notes;

  // Leaving keeps what was written.
  const close = async () => {
    if (dirty) await onSave({ notes });
    onClose();
  };

  const summarize = async () => {
    if (!notes.trim() || summarizing) return;
    setSummarizing(true);
    setMessage(null);
    try {
      if (dirty) await onSave({ notes });
      const response = await fetch("/api/meetings/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ title: meeting.title, notes }),
      });
      const data = (await response.json()) as { summary?: string; error?: string };
      if (!response.ok || !data.summary) {
        setMessage(data.error || "Não foi possível gerar o resumo.");
      } else if (!(await onSave({ summary: data.summary }))) {
        setMessage("O resumo foi gerado, mas não foi possível salvá-lo.");
      }
    } catch {
      setMessage("Sem conexão para gerar o resumo.");
    } finally {
      setSummarizing(false);
    }
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
      <header className="flex items-center gap-1 border-b px-2 py-3">
        <button onClick={close} aria-label="Voltar" className="p-2 text-muted-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{meeting.title}</h2>
          <p className="text-xs text-muted-foreground">
            {whenLabel(meeting)} · {meetingModeLabels[meeting.mode]}
          </p>
        </div>
      </header>

      {/* The whole screen is the notes field. */}
      <textarea
        aria-label="Anotações da reunião"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => {
          if (dirty) onSave({ notes });
        }}
        placeholder="Escreva aqui durante a reunião"
        className="min-h-0 w-full flex-1 resize-none bg-transparent px-5 py-4 text-base leading-relaxed outline-none placeholder:text-muted-foreground/60"
      />

      {meeting.summary && (
        <div className="max-h-[40%] shrink-0 space-y-2 overflow-y-auto border-t px-5 py-3">
          <Label>Resumo</Label>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {meeting.summary}
          </p>
        </div>
      )}

      <footer className="shrink-0 space-y-2 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {message && <p className="text-sm text-destructive">{message}</p>}
        <Button
          type="button"
          onClick={summarize}
          disabled={!notes.trim() || summarizing}
          className="mx-auto flex h-12 w-full max-w-2xl text-base"
        >
          <Sparkles className="h-4 w-4" />
          {summarizing
            ? "Gerando resumo..."
            : meeting.summary
              ? "Gerar resumo de novo"
              : "Gerar resumo e próximos passos"}
        </Button>
      </footer>
    </div>
  );
}
