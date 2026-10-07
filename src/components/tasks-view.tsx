"use client";

import { useState } from "react";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Archive,
  ArrowDownUp,
  Eye,
  EyeOff,
  CalendarClock,
  Check,
  FolderKanban,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Checklist } from "@/components/checklist";
import { SwipeToArchive } from "@/components/swipe-to-archive";
import { CategoryPicker, categoryColorClass } from "@/components/category-picker";
import type { CategoriesState } from "@/hooks/use-categories";
import { Toast, type ToastMessage } from "@/components/toast";
import type { TaskInput, useTasks } from "@/hooks/use-tasks";
import type { Category, ChecklistItem, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// "1.250,50" or "1250.50" -> 1250.5
function parseValue(input: string) {
  const text = input.trim();
  if (!text) return null;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

// The task list is owned by the page, which also shows it in the calendar.
export function TasksView({
  tasks,
  loading,
  createTask,
  updateTask,
  deleteTask,
  categories,
}: ReturnType<typeof useTasks> & { categories: CategoriesState }) {
  const [formOpen, setFormOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  // The eye: on shows checked tasks in place, off hides them.
  const [hideDone, setHideDone] = useState(false);
  // The list is split by day. "date": the deadline day, nearest first.
  // "added": the day the task was registered, latest first.
  const [sortBy, setSortBy] = useState<"added" | "date">("date");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const confirmDelete = async () => {
    const task = deleteTarget;
    setDeleteTarget(null);
    if (task && (await deleteTask(task.id))) {
      setToast({ id: Date.now(), text: "Tarefa apagada" });
    }
  };

  // Done tasks stay in place, marked as done; the filter narrows to only them.
  const filtered = tasks.filter(
    (task) =>
      !!task.archived_at === showArchived &&
      (!showDone || !!task.completed_at) &&
      // "Concluídas" asks for the checked ones, so it wins over the eye.
      (showDone || !hideDone || !task.completed_at)
  );

  // Tasks arrive ordered by when they were added. A task without a deadline
  // goes last when ordering by date; one without a time counts as end of day.
  const deadline = (task: Task) =>
    task.due_date
      ? new Date(`${task.due_date}T${task.due_time || "23:59"}`).getTime()
      : Infinity;
  const visible =
    sortBy === "date"
      ? [...filtered].sort((a, b) => deadline(a) - deadline(b))
      : filtered;

  // Consecutive tasks of the same day share a title such as "Quarta-feira 07/10".
  const dayKey = (task: Task) =>
    sortBy === "date"
      ? (task.due_date ?? "")
      : format(new Date(task.created_at), "yyyy-MM-dd");
  const groups: { key: string; label: string; tasks: Task[] }[] = [];
  for (const task of visible) {
    const key = dayKey(task);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.tasks.push(task);
    } else {
      groups.push({
        key,
        label: key
          ? format(parseISO(key), "EEEE dd/MM", { locale: ptBR })
          : "Sem prazo",
        tasks: [task],
      });
    }
  }

  const toggleArchived = (task: Task) => {
    const archive = !task.archived_at;
    updateTask(task.id, {
      archived_at: archive ? new Date().toISOString() : null,
    });
    setToast({
      id: Date.now(),
      text: archive ? "Tarefa arquivada" : "Tarefa desarquivada",
      ...(archive && {
        actionLabel: "Desfazer",
        onAction: () => {
          updateTask(task.id, { archived_at: null });
          setToast(null);
        },
      }),
    });
  };

  const toggleDone = (task: Task) => {
    const done = !task.completed_at;
    updateTask(task.id, {
      completed_at: done ? new Date().toISOString() : null,
    });
    setToast({
      id: Date.now(),
      text: done ? "Tarefa concluída" : "Tarefa reaberta",
      ...(done && {
        actionLabel: "Desfazer",
        onAction: () => {
          updateTask(task.id, { completed_at: null });
          setToast(null);
        },
      }),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={showDone ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setShowDone((prev) => !prev)}
        >
          <Check className="h-3 w-3" />
          Concluídas
        </Badge>
        <Badge
          variant={showArchived ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setShowArchived((prev) => !prev)}
        >
          <Archive className="h-3 w-3" />
          Arquivadas
        </Badge>
        <span className="ml-auto flex items-center gap-2">
          <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
          <Badge
            variant={sortBy === "added" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSortBy("added")}
          >
            Adição
          </Badge>
          <Badge
            variant={sortBy === "date" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSortBy("date")}
          >
            Data
          </Badge>
          <button
            type="button"
            onClick={() => setHideDone((prev) => !prev)}
            aria-pressed={!hideDone}
            aria-label={hideDone ? "Mostrar concluídas" : "Ocultar concluídas"}
            title={hideDone ? "Mostrar concluídas" : "Ocultar concluídas"}
            className={cn(
              "flex h-6 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
              hideDone
                ? "text-muted-foreground"
                : "border-foreground bg-foreground text-background"
            )}
          >
            {hideDone ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {showArchived
            ? "Nenhuma tarefa arquivada."
            : showDone
              ? "Nenhuma tarefa concluída."
              : "Nenhuma tarefa ainda."}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
          <section key={group.key || "none"} className="space-y-2">
          <h3 className="text-sm font-semibold first-letter:uppercase">
            {group.label}
          </h3>
          {group.tasks.map((task) => (
            <SwipeToArchive
              key={task.id}
              archived={!!task.archived_at}
              onArchive={() => toggleArchived(task)}
            >
            <TaskCard
              task={task}
              category={categories.categories.find(
                (category) => category.id === task.category_id
              )}
              onToggleDone={() => toggleDone(task)}
              onChecklistChange={(checklist) =>
                updateTask(task.id, { checklist })
              }
              onDelete={() => setDeleteTarget(task)}
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
          Nova tarefa
        </Button>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <TaskForm
            categories={categories}
            onCancel={() => setFormOpen(false)}
            onSubmit={async (input) => {
              const task = await createTask(input);
              if (task) setFormOpen(false);
              return !!task;
            }}
          />
        </DialogContent>
      </Dialog>

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

function TaskCard({
  task,
  category,
  onToggleDone,
  onChecklistChange,
  onDelete,
}: {
  task: Task;
  category?: Category;
  onChecklistChange: (checklist: ChecklistItem[]) => void;
  onToggleDone: () => void;
  onDelete: () => void;
}) {
  const done = !!task.completed_at;
  const checklist = task.checklist ?? [];
  // due_date is a plain "yyyy-MM-dd"; parseISO keeps it in local time.
  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  // With a time, it is late once that moment passes; without, after the day ends.
  const overdue =
    !done &&
    !!dueDate &&
    (task.due_time
      ? isBefore(parseISO(`${task.due_date}T${task.due_time}`), new Date())
      : isBefore(dueDate, startOfDay(new Date())));

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

        <div className="min-w-0 flex-1">
          <h4
            className={cn(
              "text-sm font-semibold sm:text-base",
              done && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {task.description}
            </p>
          )}
          {checklist.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Checklist · {checklist.filter((item) => item.done).length}/
                {checklist.length}
              </p>
              <Checklist items={checklist} onChange={onChecklistChange} compact />
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {category && (
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    categoryColorClass(category.color)
                  )}
                />
                {category.name}
              </span>
            )}
            {task.project && (
              <span className="flex items-center gap-1">
                <FolderKanban className="h-3.5 w-3.5" />
                {task.project}
              </span>
            )}
            {dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  overdue && "font-medium text-destructive"
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                {format(dueDate, "dd/MM/yyyy")}
                {task.due_time && ` às ${task.due_time.slice(0, 5)}`}
                {overdue && " (atrasada)"}
              </span>
            )}
            {task.value != null && (
              <span className="font-medium text-foreground">
                {currency.format(Number(task.value))}
              </span>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          aria-label="Excluir tarefa"
          className="shrink-0 text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TaskForm({
  categories,
  onSubmit,
  onCancel,
}: {
  categories: CategoriesState;
  onSubmit: (input: TaskInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [dueTime, setDueTime] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const valueInvalid = !!value.trim() && parseValue(value) === null;
  const canSave = !!title.trim() && !valueInvalid && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setSaveError(false);
    const saved = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      project: project.trim() || null,
      due_date: dueDate || null,
      due_time: dueDate && dueTime ? dueTime : null,
      category_id: categoryId,
      checklist,
      value: parseValue(value),
    });
    setSaving(false);
    if (!saved) setSaveError(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Título</Label>
        <Input
          id="task-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Entregar proposta"
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Descrição</Label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes da tarefa"
          rows={3}
          className="text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-project">Projeto</Label>
        <Input
          id="task-project"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="Nome do projeto"
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-due">Prazo</Label>
        <Input
          id="task-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="block h-12 appearance-none text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-due-time">Hora do prazo (opcional)</Label>
        <Input
          id="task-due-time"
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          disabled={!dueDate}
          className="block h-12 appearance-none text-base"
        />
      </div>

      <div className="space-y-2">
        <Label>Checklist</Label>
        <Checklist items={checklist} onChange={setChecklist} />
      </div>

      <div className="space-y-2">
        <Label>Categoria</Label>
        <CategoryPicker state={categories} value={categoryId} onChange={setCategoryId} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-value">Valor (R$)</Label>
        <Input
          id="task-value"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0,00"
          className="h-12 text-base"
        />
        {valueInvalid && (
          <p className="text-sm text-destructive">Digite um valor válido.</p>
        )}
      </div>

      {saveError && (
        <p className="text-sm text-destructive">
          Não foi possível salvar. Tente de novo.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-12 flex-1 text-base"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSave} className="h-12 flex-1 text-base">
          {saving ? "Salvando..." : "Salvar tarefa"}
        </Button>
      </div>
    </form>
  );
}
