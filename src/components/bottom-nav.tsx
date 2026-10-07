"use client";

import { CalendarDays, Home, KanbanSquare, LayoutDashboard } from "lucide-react";
import type { View } from "@/components/sidebar";
import { cn } from "@/lib/utils";

export type Page = "home" | View;

interface BottomNavProps {
  active: Page;
  onNavigate: (page: Page) => void;
  trelloConnected: boolean;
}

const pages = [
  { value: "home" as const, label: "Início", icon: Home },
  { value: "entries" as const, label: "Agenda", icon: LayoutDashboard },
  { value: "calendar" as const, label: "Calendário", icon: CalendarDays },
  { value: "trello" as const, label: "Trello", icon: KanbanSquare },
];

export function BottomNav({ active, onNavigate, trelloConnected }: BottomNavProps) {
  return (
    <nav className="flex shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      {pages
        .filter(({ value }) => value !== "trello" || trelloConnected)
        .map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onNavigate(value)}
            aria-current={active === value ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
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
