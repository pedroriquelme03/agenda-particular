"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Entry } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ConvertTarget = "task" | "appointment";

export interface Conversion {
  target: ConvertTarget;
  title: string;
  // "yyyy-MM-dd" and "HH:mm"; both required for an appointment.
  date: string;
  time: string;
}

interface ConvertDialogProps {
  // The note or link being turned into something else; null keeps it closed.
  entry: Entry | null;
  onClose: () => void;
  onConvert: (conversion: Conversion) => Promise<boolean>;
}

// Turns a note or a link into a task or an appointment.
export function ConvertDialog({ entry, onClose, onConvert }: ConvertDialogProps) {
  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transformar em</DialogTitle>
          <DialogDescription>
            {entry?.type === "link" ? "Este link" : "Esta anotação"} vira uma tarefa
            ou um compromisso.
          </DialogDescription>
        </DialogHeader>
        {entry && <ConvertForm key={entry.id} entry={entry} onConvert={onConvert} />}
      </DialogContent>
    </Dialog>
  );
}

function ConvertForm({
  entry,
  onConvert,
}: {
  entry: Entry;
  onConvert: (conversion: Conversion) => Promise<boolean>;
}) {
  const [target, setTarget] = useState<ConvertTarget>("task");
  const [title, setTitle] = useState(
    entry.title || entry.content.split("\n")[0].slice(0, 80) || entry.link_url || ""
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const isAppointment = target === "appointment";
  const canSave =
    !!title.trim() && (!isAppointment || (!!date && !!time)) && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setSaveError(false);
    const saved = await onConvert({ target, title: title.trim(), date, time });
    setSaving(false);
    if (!saved) setSaveError(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-1 rounded-lg border p-1">
        {(["task", "appointment"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTarget(value)}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
              target === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
          >
            {value === "task" ? "Tarefa" : "Compromisso"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="convert-title">Título</Label>
        <Input
          id="convert-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="convert-date">
          {isAppointment ? "Data" : "Prazo (opcional)"}
        </Label>
        <Input
          id="convert-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="block h-12 appearance-none text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="convert-time">
          {isAppointment ? "Hora" : "Hora do prazo (opcional)"}
        </Label>
        <Input
          id="convert-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={!isAppointment && !date}
          className="block h-12 appearance-none text-base"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {isAppointment
          ? "O item passa a aparecer no calendário como compromisso."
          : "Uma tarefa é criada com o conteúdo, e o item original é arquivado."}
      </p>

      {saveError && (
        <p className="text-sm text-destructive">
          Não foi possível salvar. Tente de novo.
        </p>
      )}

      <Button type="submit" disabled={!canSave} className="h-12 w-full text-base">
        {saving ? "Salvando..." : "Transformar"}
      </Button>
    </form>
  );
}
