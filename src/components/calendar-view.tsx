"use client";

import { useMemo } from "react";
import { EventManager, type Event, type EventDraft } from "@/components/event-manager";
import type { Entry, EntryType } from "@/lib/types";

const APPOINTMENT = "Compromisso";

const typeCategories: Record<EntryType, string> = {
  text: "Anotação",
  voice: "Voz",
  image: "Imagem",
  link: "Link",
};

const categoryColors: Record<string, string> = {
  [APPOINTMENT]: "blue",
  Anotação: "green",
  Voz: "purple",
  Imagem: "orange",
  Link: "pink",
};

const categories = [APPOINTMENT, ...Object.values(typeCategories)];

const HOUR_MS = 60 * 60 * 1000;

// Appointments sit on their scheduled date; everything else on the day it was created.
function toEvent(entry: Entry): Event {
  const isAppointment = entry.is_reminder && !!entry.reminder_date;
  const category = isAppointment ? APPOINTMENT : typeCategories[entry.type];
  const startTime = new Date(
    isAppointment ? entry.reminder_date! : entry.created_at
  );
  const firstLine = entry.content.split("\n")[0].trim();

  return {
    id: entry.id,
    title: entry.title || firstLine.slice(0, 60) || category,
    description: entry.content,
    startTime,
    endTime: new Date(startTime.getTime() + HOUR_MS),
    color: categoryColors[category],
    category,
    tags: entry.tags,
    movable: isAppointment,
  };
}

interface CalendarViewProps {
  entries: Entry[];
  createEntry: (
    entry: Omit<Entry, "id" | "created_at" | "updated_at">
  ) => Promise<Entry | null>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<Entry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
}

export function CalendarView({
  entries,
  createEntry,
  updateEntry,
  deleteEntry,
}: CalendarViewProps) {
  const events = useMemo(() => entries.map(toEvent), [entries]);

  const handleCreate = (draft: EventDraft) => {
    createEntry({
      type: "text",
      title: draft.title,
      content: draft.description.trim(),
      image_url: null,
      audio_url: null,
      link_url: null,
      trello_card_id: null,
      is_reminder: true,
      reminder_date: draft.startTime.toISOString(),
      tags: ["compromisso"],
    });
  };

  const handleUpdate = (id: string, changes: Partial<Event>) => {
    const current = events.find((event) => event.id === id);
    if (!current) return;

    const updates: Partial<Entry> = {};
    if (changes.title !== undefined && changes.title !== current.title) {
      updates.title = changes.title.trim() || null;
    }
    if (
      changes.description !== undefined &&
      changes.description !== current.description
    ) {
      updates.content = changes.description;
    }
    if (
      current.movable &&
      changes.startTime &&
      changes.startTime.getTime() !== current.startTime.getTime()
    ) {
      updates.reminder_date = changes.startTime.toISOString();
    }

    if (Object.keys(updates).length > 0) updateEntry(id, updates);
  };

  return (
    <EventManager
      events={events}
      categories={categories}
      onEventCreate={handleCreate}
      onEventUpdate={handleUpdate}
      onEventDelete={deleteEntry}
    />
  );
}
