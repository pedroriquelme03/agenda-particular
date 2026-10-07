"use client";

import {
  FileText,
  Mic,
  ImageIcon,
  Link2,
  LayoutDashboard,
  CalendarDays,
  Lightbulb,
  ListTodo,
  Wallet,
  Settings,
  LogOut,
  KanbanSquare,
} from "lucide-react";
import type { EntryType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { InstallButton } from "@/components/pwa";

export type View =
  | "entries"
  | "calendar"
  | "links"
  | "tasks"
  | "ideas"
  | "finance"
  | "trello";

interface SidebarProps {
  view: View;
  filter: EntryType | "all";
  onFilterChange: (filter: EntryType | "all") => void;
  onViewChange: (view: View) => void;
  onSettingsClick: () => void;
  onSignOut: () => void;
  trelloConnected: boolean;
}

export const filters = [
  { value: "all" as const, label: "Tudo", icon: LayoutDashboard },
  { value: "text" as const, label: "Textos", icon: FileText },
  { value: "voice" as const, label: "Voz", icon: Mic },
  { value: "image" as const, label: "Imagens", icon: ImageIcon },
  { value: "link" as const, label: "Links", icon: Link2 },
];

// The pages besides the notes list (which the filters above open).
const pages = [
  { value: "calendar" as const, label: "Calendário", icon: CalendarDays },
  { value: "tasks" as const, label: "Tarefas", icon: ListTodo },
  { value: "links" as const, label: "Links", icon: Link2 },
  { value: "ideas" as const, label: "Ideias", icon: Lightbulb },
  { value: "finance" as const, label: "Financeiro", icon: Wallet },
  { value: "trello" as const, label: "Quadros Trello", icon: KanbanSquare },
];

export function Sidebar({
  view,
  filter,
  onFilterChange,
  onViewChange,
  onSettingsClick,
  onSignOut,
  trelloConnected,
}: SidebarProps) {
  // Desktop only: small screens use the bottom bar and the filter chips instead.
  return (
    <aside className="hidden md:flex w-60 border-r bg-muted/30 flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold tracking-tight">Minha Agenda</h1>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {filters.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => {
              onViewChange("entries");
              onFilterChange(value);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              view === "entries" && filter === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}

        <Separator className="my-2" />
        {pages
          .filter(({ value }) => value !== "trello" || trelloConnected)
          .map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onViewChange(value)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                view === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
      </nav>

      <div className="p-2 border-t space-y-1">
        <InstallButton />
        <button
          onClick={() => {
            onSettingsClick();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Config Trello
        </button>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
