"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Entry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LinkPickerProps {
  // The note whose links are being chosen; null keeps the dialog closed.
  note: Entry | null;
  links: Entry[];
  onClose: () => void;
  onSave: (linkedIds: string[]) => void;
}

// Chooses which saved links a note is attached to.
export function LinkPicker({ note, links, onClose, onSave }: LinkPickerProps) {
  return (
    <Dialog
      open={note !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular links</DialogTitle>
          <DialogDescription>
            Escolha os links salvos que fazem parte desta anotação.
          </DialogDescription>
        </DialogHeader>
        {note && (
          // Keyed so the selection starts from this note's links each time.
          <LinkChoices
            key={note.id}
            initial={note.linked_ids ?? []}
            links={links}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LinkChoices({
  initial,
  links,
  onClose,
  onSave,
}: {
  initial: string[];
  links: Entry[];
  onClose: () => void;
  onSave: (linkedIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((other) => other !== id) : [...prev, id]
    );

  return (
    <>
      {links.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nenhum link salvo ainda. Adicione um na página Links.
        </p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => {
            const isSelected = selected.includes(link.id);
            return (
              <li key={link.id}>
                <button
                  type="button"
                  onClick={() => toggle(link.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    isSelected && "border-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-muted-foreground/50"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    {link.title && (
                      <span className="block truncate text-sm font-medium">
                        {link.title}
                      </span>
                    )}
                    <span className="block truncate text-xs text-muted-foreground">
                      {link.link_url}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(selected)}>Salvar</Button>
      </DialogFooter>
    </>
  );
}
