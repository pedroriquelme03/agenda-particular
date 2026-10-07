"use client";

import { useMemo } from "react";
import { EventManager, type Event, type EventDraft } from "@/components/event-manager";
import { format } from "date-fns";
import type { Entry, EntryType, Task } from "@/lib/types";

const APPOINTMENT = "Compromisso";
const TASK = "Tarefa";
// Entries and tasks live in different tables; the prefix tells them apart.
const TASK_PREFIX = "task:";
// Where a deadline without a time of day sits in the hourly views.
const TASK_HOUR = 9;

const typeCategories: Record<EntryType, string> = {
  text: "Anotação",
  voice: "Voz",
  image: "Imagem",
  link: "Link",
};

const categoryColors: Record<string, string> = {
  [APPOINTMENT]: "blue",
  [TASK]: "red",
  Anotação: "green",
  Voz: "purple",
  Imagem: "orange",
  Link: "pink",
};

const HOUR_MS = 60 * 60 * 1000;

// Appointments sit on their scheduled date; everything else on the day it was created.
function toEvent(entry: Entry): Event {
  const isAppointment = entry.is_reminder && !!entry.reminder_date;
  const category = isAppointment ? APPOINTMENT : typeCategories[entry.type];
  const startTime = new Date(
    isAppointment ? entry.reminder_date! : entry.created_at
  );
  const hasEnd = isAppointment && !!entry.reminder_end_date;
  const firstLine = entry.content.split("\n")[0].trim();

  return {
    id: entry.id,
    title: entry.title || firstLine.slice(0, 60) || category,
    description: entry.content,
    startTime,
    endTime: hasEnd
      ? new Date(entry.reminder_end_date!)
      : new Date(startTime.getTime() + HOUR_MS),
    hasEnd,
    color: categoryColors[category],
    category,
    tags: entry.tags,
    movable: isAppointment,
    checkable: isAppointment,
    done: !!entry.completed_at,
  };
}

// Only tasks with a deadline have a day to sit on.
function taskToEvent(task: Task): Event {
  const startTime = new Date(`${task.due_date}T${task.due_time || "00:00"}`);
  if (!task.due_time) startTime.setHours(TASK_HOUR, 0, 0, 0);

  return {
    id: TASK_PREFIX + task.id,
    title: task.title,
    description: task.description,
    startTime,
    endTime: new Date(startTime.getTime() + HOUR_MS),
    color: categoryColors[TASK],
    category: TASK,
    tags: task.project ? [task.project] : [],
    movable: true,
    dateOnly: !task.due_time,
    fixedDuration: true,
    checkable: true,
    done: !!task.completed_at,
  };
}

interface CalendarViewProps {
  entries: Entry[];
  createEntry: (
    entry: Omit<Entry, "id" | "created_at" | "updated_at">
  ) => Promise<Entry | null>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<Entry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
  tasks: Task[];
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
}

export function CalendarView({
  entries,
  createEntry,
  updateEntry,
  deleteEntry,
  tasks,
  updateTask,
  deleteTask,
}: CalendarViewProps) {
  const events = useMemo(
    () => [
      ...entries.map(toEvent),
      ...tasks.filter((task) => task.due_date).map(taskToEvent),
    ],
    [entries, tasks]
  );

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
      reminder_end_date: draft.endTime ? draft.endTime.toISOString() : null,
      tags: ["compromisso"],
    });
  };

  const handleUpdate = (id: string, changes: Partial<Event>) => {
    const current = events.find((event) => event.id === id);
    if (!current) return;

    if (id.startsWith(TASK_PREFIX)) {
      const taskUpdates: Partial<Task> = {};
      if (changes.title !== undefined && changes.title.trim() !== current.title) {
        taskUpdates.title = changes.title.trim() || current.title;
      }
      if (
        changes.description !== undefined &&
        changes.description !== current.description
      ) {
        taskUpdates.description = changes.description;
      }
      if (changes.startTime) {
        const dueDate = format(changes.startTime, "yyyy-MM-dd");
        if (dueDate !== format(current.startTime, "yyyy-MM-dd")) {
          taskUpdates.due_date = dueDate;
        }
        if (
          !current.dateOnly &&
          changes.startTime.getTime() !== current.startTime.getTime()
        ) {
          taskUpdates.due_time = format(changes.startTime, "HH:mm:ss");
        }
      }
      if (Object.keys(taskUpdates).length > 0) {
        updateTask(id.slice(TASK_PREFIX.length), taskUpdates);
      }
      return;
    }

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

    if (current.movable && (changes.endTime || changes.hasEnd !== undefined)) {
      const hasEnd = changes.hasEnd ?? current.hasEnd ?? false;
      const end = hasEnd
        ? (changes.endTime ?? current.endTime).toISOString()
        : null;
      const previous = current.hasEnd ? current.endTime.toISOString() : null;
      if (end !== previous) updates.reminder_end_date = end;
    }

    if (Object.keys(updates).length > 0) updateEntry(id, updates);
  };

  return (
    <EventManager
      events={events}
      onEventCreate={handleCreate}
      onEventUpdate={handleUpdate}
      onEventDelete={(id) =>
        id.startsWith(TASK_PREFIX)
          ? deleteTask(id.slice(TASK_PREFIX.length))
          : deleteEntry(id)
      }
      onEventToggleDone={(id, done) => {
        const completed_at = done ? new Date().toISOString() : null;
        if (id.startsWith(TASK_PREFIX)) {
          updateTask(id.slice(TASK_PREFIX.length), { completed_at });
        } else {
          updateEntry(id, { completed_at });
        }
      }}
    />
  );
}
