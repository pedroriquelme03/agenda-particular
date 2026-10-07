"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Toast, type ToastMessage } from "@/components/toast";
import { useIdeas } from "@/hooks/use-ideas";
import type { Idea } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROGRESS_STEPS = [0, 25, 50, 75, 100];

function statusLabel(progress: number) {
  if (progress >= 100) return "Concluída";
  if (progress > 0) return "Em andamento";
  return "Ideia";
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-foreground transition-[width]"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function IdeasView() {
  const { ideas, loading, createIdea, updateIdea, deleteIdea, addUpdate, deleteUpdate } =
    useIdeas();
  const [formOpen, setFormOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Idea | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Looked up from the list so the open idea reflects every change made to it.
  const openIdea = ideas.find((idea) => idea.id === openId) ?? null;

  const confirmDelete = async () => {
    const idea = deleteTarget;
    setDeleteTarget(null);
    if (idea && (await deleteIdea(idea.id))) {
      setToast({ id: Date.now(), text: "Ideia apagada" });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-2xl space-y-3 p-4 md:p-6">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando...</div>
          ) : ideas.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhuma ideia ainda. Registre a primeira!
            </div>
          ) : (
            ideas.map((idea) => (
              <button
                key={idea.id}
                onClick={() => setOpenId(idea.id)}
                className={cn(
                  "block w-full space-y-2 rounded-lg border bg-card p-3 text-left sm:p-4",
                  idea.progress >= 100 && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="min-w-0 text-sm font-semibold sm:text-base">
                    {idea.title}
                  </h4>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {statusLabel(idea.progress)} · {idea.progress}%
                  </span>
                </div>
                {idea.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {idea.description}
                  </p>
                )}
                <ProgressBar value={idea.progress} />
                {idea.idea_updates[0] && (
                  <p className="truncate text-xs text-muted-foreground">
                    Último progresso: {idea.idea_updates[0].text}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t px-4 py-3">
        <Button
          onClick={() => setFormOpen(true)}
          className="mx-auto flex h-12 w-full max-w-2xl text-base"
        >
          <Plus className="h-4 w-4" />
          Nova ideia
        </Button>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova ideia</DialogTitle>
          </DialogHeader>
          <IdeaForm
            onSubmit={async (title, description) => {
              const idea = await createIdea(title, description);
              if (idea) setFormOpen(false);
              return !!idea;
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={openIdea !== null}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {openIdea && (
            <IdeaDetail
              key={openIdea.id}
              idea={openIdea}
              onProgress={(progress) => updateIdea(openIdea.id, { progress })}
              onAddUpdate={(text) => addUpdate(openIdea.id, text)}
              onDeleteUpdate={(updateId) => deleteUpdate(openIdea.id, updateId)}
              onDelete={() => {
                setDeleteTarget(openIdea);
                setOpenId(null);
              }}
            />
          )}
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

function IdeaForm({
  onSubmit,
}: {
  onSubmit: (title: string, description: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setSaveError(false);
    const saved = await onSubmit(title.trim(), description.trim());
    setSaving(false);
    if (!saved) setSaveError(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="idea-title">Título</Label>
        <Input
          id="idea-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: App de agendamento para clínicas"
          className="h-12 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="idea-description">Descrição</Label>
        <Textarea
          id="idea-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Do que se trata"
          rows={4}
          className="text-base"
        />
      </div>
      {saveError && (
        <p className="text-sm text-destructive">
          Não foi possível salvar. Tente de novo.
        </p>
      )}
      <Button
        type="submit"
        disabled={!title.trim() || saving}
        className="h-12 w-full text-base"
      >
        {saving ? "Salvando..." : "Salvar ideia"}
      </Button>
    </form>
  );
}

function IdeaDetail({
  idea,
  onProgress,
  onAddUpdate,
  onDeleteUpdate,
  onDelete,
}: {
  idea: Idea;
  onProgress: (progress: number) => void;
  onAddUpdate: (text: string) => Promise<boolean>;
  onDeleteUpdate: (updateId: string) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const addProgress = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    const saved = await onAddUpdate(text.trim());
    setSaving(false);
    if (saved) setText("");
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{idea.title}</DialogTitle>
        <DialogDescription>
          {statusLabel(idea.progress)} · {idea.progress}%
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        {idea.description && (
          <p className="whitespace-pre-wrap text-sm">{idea.description}</p>
        )}

        <div className="space-y-2">
          <Label>Progresso</Label>
          <ProgressBar value={idea.progress} />
          <div className="flex gap-2">
            {PROGRESS_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => onProgress(step)}
                className={cn(
                  "flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors",
                  idea.progress === step
                    ? "border-foreground bg-foreground text-background"
                    : "text-muted-foreground"
                )}
              >
                {step}%
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="idea-update">Registrar progresso</Label>
          <Textarea
            id="idea-update"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="O que avançou?"
            rows={2}
            className="text-base"
          />
          <Button
            type="button"
            onClick={addProgress}
            disabled={!text.trim() || saving}
            className="h-10 w-full"
          >
            {saving ? "Salvando..." : "Adicionar progresso"}
          </Button>
        </div>

        {idea.idea_updates.length > 0 && (
          <ul className="space-y-3 border-t pt-3">
            {idea.idea_updates.map((update) => (
              <li key={update.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(update.created_at), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{update.text}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Apagar este progresso"
                  className="shrink-0 text-muted-foreground"
                  onClick={() => onDeleteUpdate(update.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button
          type="button"
          variant="destructive"
          onClick={onDelete}
          className="w-full"
        >
          Apagar ideia
        </Button>
      </div>
    </>
  );
}
