"use client";

import { useMemo } from "react";
import { EventManager, type Event, type EventDraft } from "@/components/event-manager";
import { format } from "date-fns";
import { CategoryPicker } from "@/components/category-picker";
import type { CategoriesState } from "@/hooks/use-categories";
import type { Category, Entry, EntryType, Meeting, Task } from "@/lib/types";

const APPOINTMENT = "Compromisso";
const TASK = "Tarefa";
// Entries and tasks live in different tables; the prefix tells them apart.
const TASK_PREFIX = "task:";
const MEETING = "Reunião";
const MEETING_PREFIX = "meeting:";
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
  [MEETING]: "purple",
  Anotação: "green",
  Voz: "purple",
  Imagem: "orange",
  Link: "pink",
};

const HOUR_MS = 60 * 60 * 1000;

// Appointments sit on their scheduled date; everything else on the day it was created.
// A category chosen by the user sets the color and shows as the first tag.
type CategoryLookup = Map<string, Category>;

function toEvent(entry: Entry, lookup: CategoryLookup): Event {
  const custom = entry.category_id ? lookup.get(entry.category_id) : undefined;
  const isAppointment = entry.is_reminder && !!entry.reminder_date;
  const category = isAppointment ? APPOINTMENT : typeCategories[entry.type];
  const startTime = new Date(
    isAppointment ? entry.reminder_date! : entry.created_at
  );
  const hasEnd = isAppointment && !!entry.reminder_end_date;
  const firstLine = entry.content.split("\n")[0].trim();

  return {
    id: entry.id,
    createdAt: new Date(entry.created_at),
    title: entry.title || firstLine.slice(0, 60) || category,
    description: entry.content,
    startTime,
    endTime: hasEnd
      ? new Date(entry.reminder_end_date!)
      : new Date(startTime.getTime() + HOUR_MS),
    hasEnd,
    color: custom?.color ?? categoryColors[category],
    category,
    categoryId: entry.category_id ?? null,
    tags: custom ? [custom.name, ...entry.tags] : entry.tags,
    movable: isAppointment,
    checkable: isAppointment,
    done: !!entry.completed_at,
    archived: !!entry.archived_at,
  };
}

// Only tasks with a deadline have a day to sit on.
function taskToEvent(task: Task, lookup: CategoryLookup): Event {
  const custom = task.category_id ? lookup.get(task.category_id) : undefined;
  const startTime = new Date(`${task.due_date}T${task.due_time || "00:00"}`);
  if (!task.due_time) startTime.setHours(TASK_HOUR, 0, 0, 0);

  return {
    id: TASK_PREFIX + task.id,
    createdAt: new Date(task.created_at),
    title: task.title,
    description: task.description,
    startTime,
    endTime: new Date(startTime.getTime() + HOUR_MS),
    color: custom?.color ?? categoryColors[TASK],
    category: TASK,
    categoryId: task.category_id ?? null,
    tags: [custom?.name, task.project].filter((tag): tag is string => !!tag),
    movable: true,
    dateOnly: !task.due_time,
    fixedDuration: true,
    checkable: true,
    done: !!task.completed_at,
    archived: !!task.archived_at,
  };
}

function meetingToEvent(meeting: Meeting): Event {
  const startTime = new Date(
    `${meeting.meeting_date}T${meeting.meeting_time || "00:00"}`
  );
  if (!meeting.meeting_time) startTime.setHours(TASK_HOUR, 0, 0, 0);

  return {
    id: MEETING_PREFIX + meeting.id,
    createdAt: new Date(meeting.created_at),
    title: meeting.title,
    description: meeting.notes,
    startTime,
    endTime: new Date(startTime.getTime() + HOUR_MS),
    color: categoryColors[MEETING],
    category: MEETING,
    tags: [meeting.mode === "online" ? "Online" : "Presencial"],
    movable: true,
    dateOnly: !meeting.meeting_time,
    fixedDuration: true,
    checkable: true,
    done: !!meeting.completed_at,
    archived: !!meeting.archived_at,
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
  meetings: Meeting[];
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<Meeting | null>;
  deleteMeeting: (id: string) => Promise<boolean>;
  categories: CategoriesState;
}

export function CalendarView({
  entries,
  createEntry,
  updateEntry,
  deleteEntry,
  tasks,
  updateTask,
  deleteTask,
  meetings,
  updateMeeting,
  deleteMeeting,
  categories,
}: CalendarViewProps) {
  const events = useMemo(() => {
    const lookup: CategoryLookup = new Map(
      categories.categories.map((category) => [category.id, category])
    );
    return [
      // Only what has a date of its own: notes and links stay out of the calendar.
      ...entries
        .filter((entry) => entry.is_reminder && !!entry.reminder_date)
        .map((entry) => toEvent(entry, lookup)),
      ...tasks
        .filter((task) => task.due_date)
        .map((task) => taskToEvent(task, lookup)),
      ...meetings.map(meetingToEvent),
    ];
  }, [entries, tasks, meetings, categories.categories]);

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
      category_id: draft.categoryId,
    });
  };

  const handleUpdate = (id: string, changes: Partial<Event>) => {
    const current = events.find((event) => event.id === id);
    if (!current) return;

    if (id.startsWith(MEETING_PREFIX)) {
      const meetingUpdates: Partial<Meeting> = {};
      if (changes.title !== undefined && changes.title.trim() !== current.title) {
        meetingUpdates.title = changes.title.trim() || current.title;
      }
      if (
        changes.description !== undefined &&
        changes.description !== current.description
      ) {
        meetingUpdates.notes = changes.description;
      }
      if (changes.startTime) {
        const date = format(changes.startTime, "yyyy-MM-dd");
        if (date !== format(current.startTime, "yyyy-MM-dd")) {
          meetingUpdates.meeting_date = date;
        }
        if (
          !current.dateOnly &&
          changes.startTime.getTime() !== current.startTime.getTime()
        ) {
          meetingUpdates.meeting_time = format(changes.startTime, "HH:mm:ss");
        }
      }
      if (Object.keys(meetingUpdates).length > 0) {
        updateMeeting(id.slice(MEETING_PREFIX.length), meetingUpdates);
      }
      return;
    }

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
      if (
        changes.categoryId !== undefined &&
        changes.categoryId !== current.categoryId
      ) {
        taskUpdates.category_id = changes.categoryId;
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

    if (
      changes.categoryId !== undefined &&
      changes.categoryId !== current.categoryId
    ) {
      updates.category_id = changes.categoryId;
    }

    if (Object.keys(updates).length > 0) updateEntry(id, updates);
  };

  return (
    <EventManager
      events={events}
      renderCategoryPicker={(value, onChange) => (
        <CategoryPicker state={categories} value={value} onChange={onChange} />
      )}
      onEventCreate={handleCreate}
      onEventUpdate={handleUpdate}
      onEventDelete={(id) =>
        id.startsWith(MEETING_PREFIX)
          ? deleteMeeting(id.slice(MEETING_PREFIX.length))
          : id.startsWith(TASK_PREFIX)
            ? deleteTask(id.slice(TASK_PREFIX.length))
            : deleteEntry(id)
      }
      onEventArchive={(id, archive) => {
        const archived_at = archive ? new Date().toISOString() : null;
        if (id.startsWith(MEETING_PREFIX)) {
          updateMeeting(id.slice(MEETING_PREFIX.length), { archived_at });
        } else if (id.startsWith(TASK_PREFIX)) {
          updateTask(id.slice(TASK_PREFIX.length), { archived_at });
        } else {
          updateEntry(id, { archived_at });
        }
      }}
      onEventToggleDone={(id, done) => {
        const completed_at = done ? new Date().toISOString() : null;
        if (id.startsWith(MEETING_PREFIX)) {
          updateMeeting(id.slice(MEETING_PREFIX.length), { completed_at });
        } else if (id.startsWith(TASK_PREFIX)) {
          updateTask(id.slice(TASK_PREFIX.length), { completed_at });
        } else {
          updateEntry(id, { completed_at });
        }
      }}
    />
  );
}
