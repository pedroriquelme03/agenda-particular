"use client";

import { useState } from "react";
import { Check, ClipboardPaste, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useContent, type ContentInput } from "@/hooks/use-content";
import type { ContentItem, ContentPlatform } from "@/lib/types";
import { cn } from "@/lib/utils";

const platforms: { value: ContentPlatform; label: string }[] = [
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "trafego", label: "Tráfego" },
];

const platformLabel = (value: ContentPlatform) =>
  platforms.find((platform) => platform.value === value)?.label ?? value;

// "site.com" -> "https://site.com"
function normalizeUrl(value: string) {
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function ContentView() {
  const { items, loading, createItem, updateItem, deleteItem } = useContent();
  // "date" orders by the last change (a video has no date of its own).
  const filters = useListFilters("added");
  const [platform, setPlatform] = useState<ContentPlatform | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const filtered = items.filter(
    (item) =>
      (platform === "all" || item.platform === platform) &&
      passesFilters(filters, {
        done: !!item.completed_at,
        archived: !!item.archived_at,
      })
  );
  // Items arrive with the last added first.
  const visible =
    filters.sortBy === "date"
      ? [...filtered].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      : filtered;

  const toggleDone = (item: ContentItem) => {
    const done = !item.completed_at;
    updateItem(item.id, { completed_at: done ? new Date().toISOString() : null });
    setToast({
      id: Date.now(),
      text: done ? "Marcado como gravado" : "Reaberto",
      ...(done && {
        actionLabel: "Desfazer",
        onAction: () => {
          updateItem(item.id, { completed_at: null });
          setToast(null);
        },
      }),
    });
  };

  const toggleArchived = (item: ContentItem) => {
    const archive = !item.archived_at;
    updateItem(item.id, { archived_at: archive ? new Date().toISOString() : null });
    setToast({
      id: Date.now(),
      text: archive ? "Arquivado" : "Desarquivado",
      ...(archive && {
        actionLabel: "Desfazer",
        onAction: () => {
          updateItem(item.id, { archived_at: null });
          setToast(null);
        },
      }),
    });
  };

  const confirmDelete = async () => {
    const item = deleteTarget;
    setDeleteTarget(null);
    if (item && (await deleteItem(item.id))) {
      setToast({ id: Date.now(), text: "Apagado" });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-2xl space-y-3 p-4 md:p-6">
          <FilterBar filters={filters} doneLabel="Gravados" />

          {/* Same sideways-scrolling row as the filters above. */}
          <div className="-mx-4 flex touch-pan-x items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
            {[{ value: "all" as const, label: "Todas" }, ...platforms].map(
              ({ value, label }) => (
                <Badge
                  key={value}
                  variant={platform === value ? "default" : "outline"}
                  className="shrink-0 cursor-pointer"
                  onClick={() => setPlatform(value)}
                >
                  {label}
                </Badge>
              )
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando...</div>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {filters.showArchived
                ? "Nada arquivado."
                : items.length === 0
                  ? "Nenhum vídeo de referência ainda."
                  : "Nenhum vídeo com esses filtros."}
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((item) => {
                const done = !!item.completed_at;
                return (
                  <SwipeToArchive
                    key={item.id}
                    archived={!!item.archived_at}
                    onArchive={() => toggleArchived(item)}
                  >
                    <div
                      className={cn(
                        "rounded-lg border bg-card p-3 sm:p-4",
                        done && "opacity-60"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleDone(item)}
                          aria-label={
                            done ? "Desmarcar como gravado" : "Marcar como gravado"
                          }
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
                          {item.title && (
                            <h4
                              className={cn(
                                "text-sm font-semibold sm:text-base",
                                done && "text-muted-foreground line-through"
                              )}
                            >
                              {item.title}
                            </h4>
                          )}
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 truncate">{item.url}</span>
                          </a>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {platformLabel(item.platform)}
                            {done && " · gravado"}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(item)}
                          aria-label="Excluir vídeo"
                          className="shrink-0 text-muted-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </SwipeToArchive>
                );
              })}
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
          Novo vídeo de referência
        </Button>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo vídeo de referência</DialogTitle>
          </DialogHeader>
          <ContentForm
            initialPlatform={platform === "all" ? "tiktok" : platform}
            onSubmit={async (input) => {
              const item = await createItem(input);
              if (item) setFormOpen(false);
              return !!item;
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        label={deleteTarget ? deleteTarget.title || deleteTarget.url : null}
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

function ContentForm({
  initialPlatform,
  onSubmit,
}: {
  initialPlatform: ContentPlatform;
  onSubmit: (input: ContentInput) => Promise<boolean>;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>(initialPlatform);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Fills the field from the clipboard in one tap. The browser may ask the
  // user to allow it.
  const pasteLink = async () => {
    setPasteError(null);
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) setUrl(text);
      else setPasteError("Não há nada copiado para colar.");
    } catch {
      setPasteError("Não foi possível colar. Cole manualmente no campo.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || saving) return;
    setSaving(true);
    setSaveError(false);
    const saved = await onSubmit({
      url: normalizeUrl(url),
      title: title.trim() || null,
      platform,
    });
    setSaving(false);
    if (!saved) setSaveError(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="content-url">Link do vídeo</Label>
        <div className="flex gap-2">
          <Input
            id="content-url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="h-12 text-base"
          />
          <Button
            type="button"
            variant="outline"
            onClick={pasteLink}
            className="h-12 shrink-0 px-4 text-base"
          >
            <ClipboardPaste className="h-4 w-4" />
            Colar
          </Button>
        </div>
        {pasteError && <p className="text-sm text-muted-foreground">{pasteError}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content-title">Título (opcional)</Label>
        <Input
          id="content-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Gancho sobre automação"
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label>Para onde é</Label>
        <div className="grid grid-cols-2 gap-1 rounded-lg border p-1">
          {platforms.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPlatform(value)}
              className={cn(
                "rounded-md py-2 text-sm font-medium transition-colors",
                platform === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-destructive">
          Não foi possível salvar. Tente de novo.
        </p>
      )}

      <Button
        type="submit"
        disabled={!url.trim() || saving}
        className="h-12 w-full text-base"
      >
        {saving ? "Salvando..." : "Adicionar vídeo"}
      </Button>
    </form>
  );
}
