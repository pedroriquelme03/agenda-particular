"use client";

import { useState } from "react";
import { ClipboardPaste, Plus } from "lucide-react";
import { FilterBar, passesFilters, useListFilters } from "@/components/filter-bar";
import { SwipeToArchive } from "@/components/swipe-to-archive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntryCard } from "@/components/entry-card";
import type { Entry } from "@/lib/types";

interface LinksViewProps {
  entries: Entry[];
  loading: boolean;
  createEntry: (
    entry: Omit<Entry, "id" | "created_at" | "updated_at">
  ) => Promise<Entry | null>;
  deleteEntry: (id: string) => void;
  onTrelloSend?: (entry: Entry) => void;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<Entry | null>;
  onToggleDone: (entry: Entry) => void;
  onConvert: (entry: Entry) => void;
  // Archives the entry, or restores it when it is already archived.
  onArchive: (entry: Entry) => void;
}

// "site.com" -> "https://site.com"
function normalizeUrl(value: string) {
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function LinksView({
  entries,
  loading,
  createEntry,
  deleteEntry,
  onTrelloSend,
  updateEntry,
  onToggleDone,
  onConvert,
  onArchive,
}: LinksViewProps) {
  // Links have no date of their own: "date" orders by the last change.
  const filters = useListFilters("added");
  const { showArchived, sortBy } = filters;
  const [formOpen, setFormOpen] = useState(false);
  // The link being edited; null while the form is creating a new one.
  const [editing, setEditing] = useState<Entry | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  const openForm = (entry: Entry | null) => {
    setEditing(entry);
    setUrl(entry?.link_url ?? "");
    setTitle(entry?.title ?? "");
    setNote(entry?.content ?? "");
    setSaveError(false);
    setPasteError(null);
    setFormOpen(true);
  };
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Fills the field from the clipboard in one tap. The browser may ask the
  // user to allow it, and refuses outside a tap.
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

  const filteredLinks = entries.filter(
    (entry) =>
      entry.type === "link" &&
      passesFilters(filters, {
        done: !!entry.completed_at,
        archived: !!entry.archived_at,
      })
  );
  // Entries arrive with the last added first.
  const links =
    sortBy === "date"
      ? [...filteredLinks].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      : filteredLinks;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || saving) return;
    setSaving(true);
    setSaveError(false);
    const fields = {
      title: title.trim() || null,
      content: note.trim(),
      link_url: normalizeUrl(url),
    };
    const entry = editing
      ? await updateEntry(editing.id, fields)
      : await createEntry({
          type: "link",
          ...fields,
          image_url: null,
          audio_url: null,
          trello_card_id: null,
          is_reminder: false,
          reminder_date: null,
          tags: [],
        });
    setSaving(false);
    if (entry) {
      setFormOpen(false);
    } else {
      setSaveError(true);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
          <FilterBar filters={filters} />
          {loading && links.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : links.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {showArchived
                ? "Nenhum link arquivado."
                : "Nenhum link ainda. Adicione o primeiro!"}
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((entry) => (
                <SwipeToArchive
                  key={entry.id}
                  archived={!!entry.archived_at}
                  onArchive={() => onArchive(entry)}
                >
                  <EntryCard
                    entry={entry}
                    onDelete={deleteEntry}
                    onTrelloSend={onTrelloSend}
                    onToggleDone={onToggleDone}
                    onEdit={openForm}
                    onConvert={onConvert}
                    attached={entries.filter((other) =>
                      other.linked_ids?.includes(entry.id)
                    )}
                  />
                </SwipeToArchive>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t px-4 py-3">
        <Button
          onClick={() => openForm(null)}
          className="mx-auto flex h-12 w-full max-w-2xl text-base"
        >
          <Plus className="h-4 w-4" />
          Novo link
        </Button>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar link" : "Novo link"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">Link</Label>
              <div className="flex gap-2">
                <Input
                  id="link-url"
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
              {pasteError && (
                <p className="text-sm text-muted-foreground">{pasteError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-title">Título (opcional)</Label>
              <Input
                id="link-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Artigo para ler depois"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-note">Anotação (opcional)</Label>
              <Textarea
                id="link-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Por que guardei este link"
                rows={3}
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
              disabled={!url.trim() || saving}
              className="h-12 w-full text-base"
            >
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar alterações"
                  : "Adicionar link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
