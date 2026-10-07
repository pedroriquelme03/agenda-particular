"use client";

import { useState } from "react";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { CalendarClock, Check, FolderKanban, Plus, Trash2 } from "lucide-react";
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
import { Toast, type ToastMessage } from "@/components/toast";
import { useTasks } from "@/hooks/use-tasks";
import type { Task } from "@/lib/types";
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

export function TasksView() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const [formOpen, setFormOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const visible = tasks.filter((task) => !!task.completed_at === showDone);

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
      <div className="flex">
        <Badge
          variant={showDone ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setShowDone((prev) => !prev)}
        >
          <Check className="h-3 w-3" />
          Concluídas
        </Badge>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {showDone ? "Nenhuma tarefa concluída." : "Nenhuma tarefa pendente."}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleDone={() => toggleDone(task)}
              onDelete={() => deleteTask(task.id)}
            />
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
            onCancel={() => setFormOpen(false)}
            onSubmit={async (input) => {
              const task = await createTask(input);
              if (task) setFormOpen(false);
              return !!task;
            }}
          />
        </DialogContent>
      </Dialog>

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
  onToggleDone,
  onDelete,
}: {
  task: Task;
  onToggleDone: () => void;
  onDelete: () => void;
}) {
  const done = !!task.completed_at;
  // due_date is a plain "yyyy-MM-dd"; parseISO keeps it in local time.
  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  const overdue = !done && !!dueDate && isBefore(dueDate, startOfDay(new Date()));

  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4">
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
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: {
    title: string;
    description: string;
    project: string | null;
    due_date: string | null;
    value: number | null;
  }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("");
  const [dueDate, setDueDate] = useState("");
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
