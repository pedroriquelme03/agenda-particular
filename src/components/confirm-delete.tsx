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

export function ConfirmDelete({ label, onCancel, onConfirm }: ConfirmDeleteProps) {
  return (
    <Dialog
      open={label !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Apagar?</DialogTitle>
          <DialogDescription>
            {label ? `"${label}" será apagado. ` : ""}
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
