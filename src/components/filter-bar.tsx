"use client";

import { useState } from "react";
import { Archive, ArrowDownUp, Check, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SortBy = "added" | "date";

// The choices every list offers: only done, only archived, the order, and
// whether done items stay visible.
export function useListFilters(initialSort: SortBy = "added") {
  const [showDone, setShowDone] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>(initialSort);
  // The eye: off (false) shows checked items in place, on hides them.
  const [hideDone, setHideDone] = useState(false);

  return {
    showDone,
    setShowDone,
    showArchived,
    setShowArchived,
    sortBy,
    setSortBy,
    hideDone,
    setHideDone,
  };
}

export type ListFilters = ReturnType<typeof useListFilters>;

// Whether an item belongs in the list under the current choices.
export function passesFilters(
  filters: Pick<ListFilters, "showDone" | "showArchived" | "hideDone">,
  item: { done: boolean; archived: boolean }
) {
  return (
    item.archived === filters.showArchived &&
    (!filters.showDone || item.done) &&
    // "Concluídos" asks for the checked ones, so it wins over the eye.
    (filters.showDone || !filters.hideDone || !item.done)
  );
}

interface FilterBarProps {
  filters: ListFilters;
  doneLabel?: string;
  archivedLabel?: string;
  // Parts a list has no use for can be left out.
  done?: boolean;
  archived?: boolean;
  sort?: boolean;
  className?: string;
}

// One row that scrolls sideways when it does not fit, instead of wrapping.
export function FilterBar({
  filters,
  doneLabel = "Concluídos",
  archivedLabel = "Arquivados",
  done = true,
  archived = true,
  sort = true,
  className,
}: FilterBarProps) {
  const { showDone, showArchived, sortBy, hideDone } = filters;

  return (
    <div
      className={cn(
        // The one place that scrolls sideways; the bleed lets it reach the screen edges.
        "-mx-4 flex touch-pan-x items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {done && (
        <Badge
          variant={showDone ? "default" : "outline"}
          className="shrink-0 cursor-pointer"
          onClick={() => filters.setShowDone((prev) => !prev)}
        >
          <Check className="h-3 w-3" />
          {doneLabel}
        </Badge>
      )}
      {archived && (
        <Badge
          variant={showArchived ? "default" : "outline"}
          className="shrink-0 cursor-pointer"
          onClick={() => filters.setShowArchived((prev) => !prev)}
        >
          <Archive className="h-3 w-3" />
          {archivedLabel}
        </Badge>
      )}
      {sort && (
        <>
          <ArrowDownUp className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Badge
            variant={sortBy === "added" ? "default" : "outline"}
            className="shrink-0 cursor-pointer"
            onClick={() => filters.setSortBy("added")}
          >
            Adição
          </Badge>
          <Badge
            variant={sortBy === "date" ? "default" : "outline"}
            className="shrink-0 cursor-pointer"
            onClick={() => filters.setSortBy("date")}
          >
            Data
          </Badge>
        </>
      )}
      {done && (
        <button
          type="button"
          onClick={() => filters.setHideDone((prev) => !prev)}
          aria-pressed={!hideDone}
          aria-label={hideDone ? "Mostrar o que tem check" : "Ocultar o que tem check"}
          title={hideDone ? "Mostrar o que tem check" : "Ocultar o que tem check"}
          className={cn(
            "flex h-6 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
            !sort && "ml-auto",
            hideDone
              ? "text-muted-foreground"
              : "border-foreground bg-foreground text-background"
          )}
        >
          {hideDone ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}
