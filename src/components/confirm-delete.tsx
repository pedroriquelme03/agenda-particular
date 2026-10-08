"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDeleteProps {
  // Name of what is about to be deleted; null keeps the dialog closed.
  label: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

// Long names (a whole note, a URL) are cut so the dialog stays small.
const MAX_LABEL_LENGTH = 80;

export function ConfirmDelete({ label, onCancel, onConfirm }: ConfirmDeleteProps) {
  const shortLabel =
    label && label.length > MAX_LABEL_LENGTH
      ? label.slice(0, MAX_LABEL_LENGTH).trimEnd() + "…"
      : label;

  return (
    <Dialog
      open={label !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader className="min-w-0">
          <DialogTitle>Apagar?</DialogTitle>
          {/* A URL has no spaces to wrap at, so it may break anywhere. */}
          <DialogDescription className="[overflow-wrap:anywhere]">
            {shortLabel ? `"${shortLabel}" será apagado. ` : ""}
            Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Apagar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
