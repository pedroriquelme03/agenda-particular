"use client";

import {
  CalendarDays,
  Home,
  KanbanSquare,
  LayoutDashboard,
  Link2,
  ListTodo,
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
  { value: "trello" as const, label: "Trello", icon: KanbanSquare },
];

export function BottomNav({
  active,
  onNavigate,
  trelloConnected,
  showHome,
  className,
}: BottomNavProps) {
  return (
    <nav
      className={cn(
        "flex shrink-0 border-t bg-background pb-[calc(15px+env(safe-area-inset-bottom))]",
        className
      )}
    >
      {pages
        .filter(
          ({ value }) =>
            (value !== "trello" || trelloConnected) &&
            (value !== "home" || showHome)
        )
        .map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onNavigate(value)}
            aria-current={active === value ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              active === value ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={active === value ? 2.5 : 2} />
            {label}
          </button>
        ))}
    </nav>
  );
}
