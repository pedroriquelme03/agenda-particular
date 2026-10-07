"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChecklistProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  // Smaller rows, for use inside a task card.
  compact?: boolean;
}

// The steps of a task: tick them off, remove them, add new ones.
export function Checklist({ items, onChange, compact = false }: ChecklistProps) {
  const [text, setText] = useState("");

  const add = () => {
    if (!text.trim()) return;
    onChange([
      ...items,
      { id: crypto.randomUUID(), text: text.trim(), done: false },
    ]);
    setText("");
  };

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onChange(
                    items.map((other) =>
                      other.id === item.id ? { ...other, done: !other.done } : other
                    )
                  )
                }
                aria-label={item.done ? "Desmarcar item" : "Marcar item"}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                  item.done
                    ? "border-foreground bg-foreground text-background"
                    : "border-muted-foreground/50"
                )}
              >
                {item.done && <Check className="h-3 w-3" />}
              </button>
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm",
                  item.done && "text-muted-foreground line-through"
                )}
              >
                {item.text}
              </span>
              <button
                type="button"
                onClick={() => onChange(items.filter((other) => other.id !== item.id))}
                aria-label={`Remover ${item.text}`}
                className="shrink-0 p-1 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds the item instead of submitting a form around it.
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Novo item"
          aria-label="Novo item do checklist"
          className={cn("min-w-0 flex-1 text-base", compact ? "h-9" : "h-11")}
        />
        <button
          type="button"
          onClick={add}
          disabled={!text.trim()}
          aria-label="Adicionar item"
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg border text-muted-foreground disabled:opacity-40",
            compact ? "h-9 w-9" : "h-11 w-11"
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
