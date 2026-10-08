"use client";

import { useMemo } from "react";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import {
  KanbanBoard,
  type KanbanColumn,
  type KanbanTask,
} from "@/components/ui/kanban-board";
import type { useTasks } from "@/hooks/use-tasks";
import type { Task } from "@/lib/types";

type ColumnId = "todo" | "doing" | "done";

// "Done" is whatever has a completion date, as on the Tasks page; the other
// two columns come from the task's status.
function columnOf(task: Task): ColumnId {
  if (task.completed_at) return "done";
  return task.status === "doing" ? "doing" : "todo";
}

// Nearest deadline first; tasks without one go last.
const deadline = (task: Task) =>
  task.due_date
    ? new Date(`${task.due_date}T${task.due_time || "23:59"}`).getTime()
    : Infinity;

function toCard(task: Task): KanbanTask {
  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  const checklist = task.checklist ?? [];

  return {
    id: task.id,
    title: task.title,
    note: task.description || undefined,
    category: task.project || undefined,
    due: dueDate
      ? format(dueDate, "dd/MM") +
        (task.due_time ? ` ${task.due_time.slice(0, 5)}` : "")
      : undefined,
    // Amber when it is due today or already late, unless it is done.
    dueSoon:
      !task.completed_at &&
      !!dueDate &&
      isBefore(dueDate, startOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000))),
    progress:
      checklist.length > 0
        ? Math.round(
            (checklist.filter((item) => item.done).length / checklist.length) * 100
          )
        : undefined,
  };
}

// Every task that is not archived, as a board: dragging a card between
// columns changes where the task stands.
export function KanbanView({
  tasks,
  loading,
  updateTask,
}: Pick<ReturnType<typeof useTasks>, "tasks" | "loading" | "updateTask">) {
  const columns = useMemo<KanbanColumn[]>(() => {
    const active = tasks
      .filter((task) => !task.archived_at)
      .sort((a, b) => deadline(a) - deadline(b));
    const cardsOf = (id: ColumnId) =>
      active.filter((task) => columnOf(task) === id).map(toCard);

    return [
      { id: "todo", name: "A fazer", accent: "slate", tasks: cardsOf("todo") },
      { id: "doing", name: "Em andamento", accent: "blue", tasks: cardsOf("doing") },
      { id: "done", name: "Concluído", accent: "emerald", tasks: cardsOf("done") },
    ];
  }, [tasks]);

  // The board reports the whole layout after a move; save the tasks that
  // ended up in a different column.
  const handleChange = (next: KanbanColumn[]) => {
    for (const column of next) {
      for (const card of column.tasks) {
        const task = tasks.find((other) => other.id === card.id);
        if (!task || columnOf(task) === column.id) continue;
        updateTask(task.id, {
          status: column.id === "doing" ? "doing" : "todo",
          completed_at: column.id === "done" ? new Date().toISOString() : null,
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Carregando...</div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
      <KanbanBoard columns={columns} onChange={handleChange} label="Quadro de tarefas" />
    </div>
  );
}
