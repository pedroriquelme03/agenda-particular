"use client";

import { useState } from "react";
import { Archive, ClipboardPaste, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SwipeToArchive } from "@/components/swipe-to-archive";
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
  // Opens the link's own note for editing.
  onEdit: (entry: Entry) => void;
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
  onEdit,
  onToggleDone,
  onConvert,
  onArchive,
}: LinksViewProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
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

  const links = entries.filter(
    (entry) => entry.type === "link" && !!entry.archived_at === showArchived
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || saving) return;
    setSaving(true);
    setSaveError(false);
    const entry = await createEntry({
      type: "link",
      title: title.trim() || null,
      content: "",
      image_url: null,
      audio_url: null,
      link_url: normalizeUrl(url),
      trello_card_id: null,
      is_reminder: false,
      reminder_date: null,
      tags: [],
    });
    setSaving(false);
    if (entry) {
      setUrl("");
      setTitle("");
      setFormOpen(false);
    } else {
      setSaveError(true);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
          <div className="flex">
            <Badge
              variant={showArchived ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setShowArchived((prev) => !prev)}
            >
              <Archive className="h-3 w-3" />
              Arquivados
            </Badge>
          </div>
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
                    onEdit={onEdit}
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
          onClick={() => setFormOpen(true)}
          className="mx-auto flex h-12 w-full max-w-2xl text-base"
        >
          <Plus className="h-4 w-4" />
          Novo link
        </Button>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo link</DialogTitle>
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
              {saving ? "Salvando..." : "Adicionar link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
