"use client";

import { useState } from "react";
import {
  CalendarDays,
  Ellipsis,
  Home,
  KanbanSquare,
  LayoutDashboard,
  Lightbulb,
  Link2,
  ListTodo,
  Wallet,
} from "lucide-react";
import type { View } from "@/components/sidebar";
import { cn } from "@/lib/utils";

export type Page = "home" | View;

interface BottomNavProps {
  active: Page;
  onNavigate: (page: Page) => void;
  trelloConnected: boolean;
  showHome: boolean;
  className?: string;
}

const pages = [
  { value: "home" as const, label: "Início", icon: Home },
  { value: "calendar" as const, label: "Calendário", icon: CalendarDays },
  { value: "tasks" as const, label: "Tarefas", icon: ListTodo },
  { value: "entries" as const, label: "Anotações", icon: LayoutDashboard },
  { value: "links" as const, label: "Links", icon: Link2 },
];

// Pages that do not fit in the bar; they open from "Mais".
const morePages = [
  { value: "ideas" as const, label: "Ideias", icon: Lightbulb },
  { value: "finance" as const, label: "Financeiro", icon: Wallet },
  { value: "trello" as const, label: "Trello", icon: KanbanSquare },
];

const itemClass =
  "flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors";

export function BottomNav({
  active,
  onNavigate,
  trelloConnected,
  showHome,
  className,
}: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const more = morePages.filter(
    ({ value }) => value !== "trello" || trelloConnected
  );
  const moreActive = more.some(({ value }) => value === active);

  return (
    <nav
      className={cn(
        "relative flex shrink-0 border-t bg-background pb-[calc(15px+env(safe-area-inset-bottom))]",
        className
      )}
    >
      {pages
        .filter(({ value }) => value !== "home" || showHome)
        .map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => {
              setMoreOpen(false);
              onNavigate(value);
            }}
            aria-current={active === value ? "page" : undefined}
            className={cn(
              itemClass,
              active === value ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={active === value ? 2.5 : 2} />
            {label}
          </button>
        ))}

      <button
        onClick={() => setMoreOpen((prev) => !prev)}
        aria-expanded={moreOpen}
        className={cn(
          itemClass,
          moreActive || moreOpen ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <Ellipsis className="h-5 w-5" strokeWidth={moreActive ? 2.5 : 2} />
        Mais
      </button>

      {moreOpen && (
        <>
          {/* Tapping anywhere else closes the menu. */}
          <div
            className="absolute inset-x-0 bottom-full h-screen"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute right-2 bottom-full mb-2 w-48 rounded-xl border bg-background p-1 shadow-lg">
            {more.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  setMoreOpen(false);
                  onNavigate(value);
                }}
                aria-current={active === value ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active === value
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}
