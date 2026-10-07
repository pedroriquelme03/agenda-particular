"use client";

import { useState } from "react";
import { Plus, FileText, Mic, ImageIcon, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VoiceRecorder } from "./voice-recorder";
import { ImageUpload } from "./image-upload";
import { LinkInput } from "./link-input";
import { TagInput } from "./tag-input";
import { ReminderPicker } from "./reminder-picker";
import { supabase } from "@/lib/supabase";
import type { Entry, EntryType } from "@/lib/types";

type Tab = EntryType;

const tabs: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "text", label: "Texto", icon: FileText },
  { value: "voice", label: "Voz", icon: Mic },
  { value: "image", label: "Imagem", icon: ImageIcon },
  { value: "link", label: "Link", icon: Link2 },
];

interface EntryFormProps {
  onCreated: (entry: Entry) => void;
  createEntry: (
    entry: Omit<Entry, "id" | "created_at" | "updated_at">
  ) => Promise<Entry | null>;
}

export function EntryForm({ onCreated, createEntry }: EntryFormProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isReminder, setIsReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setContent("");
    setTags([]);
    setIsReminder(false);
    setReminderDate("");
  };

  const saveEntry = async (
    type: EntryType,
    extra: Partial<Entry> = {}
  ) => {
    setSaving(true);
    const entry = await createEntry({
      type,
      title: title || null,
      content: extra.content ?? content,
      image_url: extra.image_url ?? null,
      audio_url: extra.audio_url ?? null,
      link_url: extra.link_url ?? null,
      trello_card_id: null,
      is_reminder: isReminder,
      reminder_date: isReminder && reminderDate
        ? new Date(reminderDate).toISOString()
        : null,
      tags,
    });
    setSaving(false);
    if (entry) {
      onCreated(entry);
      reset();
      setOpen(false);
    }
  };

  const handleTextSave = () => {
    if (!content.trim()) return;
    saveEntry("text");
  };

  const handleVoiceSave = async (transcript: string, audioBlob: Blob | null) => {
    let audioUrl: string | null = null;
    if (audioBlob) {
      const fileName = `voice_${Date.now()}.webm`;
      const { data } = await supabase.storage
        .from("audio")
        .upload(fileName, audioBlob, { contentType: "audio/webm" });
      if (data) {
        const { data: urlData } = supabase.storage
          .from("audio")
          .getPublicUrl(data.path);
        audioUrl = urlData.publicUrl;
      }
    }
    const fullContent = [transcript, content].filter(Boolean).join("\n\n");
    saveEntry("voice", { content: fullContent, audio_url: audioUrl });
  };

  const handleImageUpload = async (file: File) => {
    const fileName = `img_${Date.now()}_${file.name}`;
    const { data } = await supabase.storage
      .from("images")
      .upload(fileName, file);
    if (data) {
      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(data.path);
      saveEntry("image", { image_url: urlData.publicUrl, content });
    }
  };

  const handleLinkSave = (url: string) => {
    const linkContent = content.trim() ? content : url;
    saveEntry("link", { link_url: url, content: linkContent });
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Nova entrada
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Nova entrada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1 border-b pb-2">
          {tabs.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div>
          <Label htmlFor="entry-title">Titulo (opcional)</Label>
          <Input
            id="entry-title"
            placeholder="Titulo da entrada"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {tab === "voice" && <VoiceRecorder onSave={handleVoiceSave} />}

        {tab === "image" && <ImageUpload onUpload={handleImageUpload} />}

        {tab === "link" && <LinkInput onSave={handleLinkSave} />}

        <div className="space-y-3">
          <Textarea
            placeholder="Escreva sua nota..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          {tab === "text" && (
            <Button onClick={handleTextSave} disabled={saving || !content.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </div>

        <TagInput tags={tags} onChange={setTags} />

        <ReminderPicker
          isReminder={isReminder}
          reminderDate={reminderDate}
          onReminderChange={setIsReminder}
          onDateChange={setReminderDate}
        />

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reset();
              setOpen(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
