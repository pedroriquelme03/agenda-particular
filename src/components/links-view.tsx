"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}: LinksViewProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const links = entries.filter((entry) => entry.type === "link");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || saving) return;
    setSaving(true);
    setSaveError(false);
    const linkUrl = normalizeUrl(url);
    const entry = await createEntry({
      type: "link",
      title: title.trim() || null,
      content: "",
      image_url: null,
      audio_url: null,
      link_url: linkUrl,
      trello_card_id: null,
      is_reminder: false,
      reminder_date: null,
      tags: [],
    });
    setSaving(false);
    if (entry) {
      setUrl("");
      setTitle("");
    } else {
      setSaveError(true);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border p-4">
        <div className="space-y-2">
          <Label htmlFor="link-url">Link</Label>
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
          <Plus className="h-4 w-4" />
          {saving ? "Salvando..." : "Adicionar link"}
        </Button>
      </form>

      {loading && links.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : links.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum link ainda. Adicione o primeiro!
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onDelete={deleteEntry}
              onTrelloSend={onTrelloSend}
            />
          ))}
        </div>
      )}
    </div>
  );
}
