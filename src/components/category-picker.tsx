"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoriesState } from "@/hooks/use-categories";
import { cn } from "@/lib/utils";

// The colors a category can have. `value` is what is stored; the calendar
// uses the same list to paint its items.
export const CATEGORY_COLORS = [
  { name: "Amarelo", value: "yellow", bg: "bg-yellow-500", text: "text-yellow-700" },
  { name: "Azul", value: "blue", bg: "bg-blue-500", text: "text-blue-700" },
  { name: "Verde", value: "green", bg: "bg-green-500", text: "text-green-700" },
  { name: "Vermelho", value: "red", bg: "bg-red-500", text: "text-red-700" },
  { name: "Roxo", value: "purple", bg: "bg-purple-500", text: "text-purple-700" },
  { name: "Laranja", value: "orange", bg: "bg-orange-500", text: "text-orange-700" },
  { name: "Rosa", value: "pink", bg: "bg-pink-500", text: "text-pink-700" },
  { name: "Cinza", value: "gray", bg: "bg-neutral-500", text: "text-neutral-700" },
];

export function categoryColorClass(color: string) {
  return (
    CATEGORY_COLORS.find((c) => c.value === color)?.bg ?? CATEGORY_COLORS[0].bg
  );
}

interface CategoryPickerProps {
  state: CategoriesState;
  value: string | null;
  onChange: (id: string | null) => void;
}

// Chooses one of the account's categories, and lets new ones be created (name
// and color) or old ones removed without leaving the form.
export function CategoryPicker({ state, value, onChange }: CategoryPickerProps) {
  const { categories, createCategory, deleteCategory } = state;
  const [managing, setManaging] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0].value);
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const category = await createCategory(name.trim(), color);
    setSaving(false);
    if (category) {
      onChange(category.id);
      setName("");
      setManaging(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const selected = value === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(selected ? null : category.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "h-3 w-3 rounded-full",
                  categoryColorClass(category.color)
                )}
              />
              {category.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setManaging((prev) => !prev)}
          className="flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-sm font-medium text-muted-foreground"
        >
          {managing ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {managing ? "Fechar" : "Categorias"}
        </button>
      </div>

      {managing && (
        <div className="space-y-3 rounded-xl border p-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              // Enter here adds the category instead of submitting the form around it.
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Nome da categoria (ex.: Online)"
            className="h-11 text-base"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setColor(option.value)}
                aria-label={option.name}
                title={option.name}
                className={cn(
                  "h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                  option.bg,
                  color === option.value && "ring-2 ring-foreground"
                )}
              />
            ))}
          </div>
          <Button
            type="button"
            onClick={add}
            disabled={!name.trim() || saving}
            className="h-10 w-full"
          >
            {saving ? "Salvando..." : "Adicionar categoria"}
          </Button>

          {categories.length > 0 && (
            <ul className="divide-y border-t pt-1">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center gap-2 py-1.5">
                  <span
                    className={cn(
                      "h-3 w-3 shrink-0 rounded-full",
                      categoryColorClass(category.color)
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {category.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Apagar categoria ${category.name}`}
                    className="text-muted-foreground"
                    onClick={() => {
                      if (value === category.id) onChange(null);
                      deleteCategory(category.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
