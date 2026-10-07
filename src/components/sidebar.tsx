"use client";

import { useState } from "react";
import {
  Link2,
  LayoutDashboard,
  CalendarDays,
  Lightbulb,
  ListTodo,
  Wallet,
  Settings,
  LogOut,
  KanbanSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  onViewChange: (view: View) => void;
  onSettingsClick: () => void;
  onSignOut: () => void;
  trelloConnected: boolean;
}

const pages = [
  { value: "entries" as const, label: "Anotações", icon: LayoutDashboard },
  { value: "calendar" as const, label: "Calendário", icon: CalendarDays },
  { value: "tasks" as const, label: "Tarefas", icon: ListTodo },
  { value: "links" as const, label: "Links", icon: Link2 },
  { value: "ideas" as const, label: "Ideias", icon: Lightbulb },
  { value: "finance" as const, label: "Financeiro", icon: Wallet },
  { value: "trello" as const, label: "Quadros Trello", icon: KanbanSquare },
];

const itemClass =
  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors";

// Desktop only: small screens use the bottom bar instead.
export function Sidebar({
  view,
  onViewChange,
  onSettingsClick,
  onSignOut,
  trelloConnected,
}: SidebarProps) {
  const [hidden, setHidden] = useState(false);

  // Hidden, it leaves only a thin strip with the button that brings it back.
  if (hidden) {
    return (
      <aside className="hidden md:flex w-12 border-r bg-muted/30 flex-col items-center h-full pt-3">
        <button
          onClick={() => setHidden(false)}
          aria-label="Mostrar barra lateral"
          title="Mostrar barra lateral"
          className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex w-60 border-r bg-muted/30 flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-4 border-b">
        <h1 className="text-lg font-bold tracking-tight">Minha Agenda</h1>
        <button
          onClick={() => setHidden(true)}
          aria-label="Ocultar barra lateral"
          title="Ocultar barra lateral"
          className="-mr-2 p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {pages
          .filter(({ value }) => value !== "trello" || trelloConnected)
          .map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onViewChange(value)}
              className={cn(
                itemClass,
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
          onClick={onSettingsClick}
          className={cn(
            itemClass,
            "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Config Trello
        </button>
        <button
          onClick={onSignOut}
          className={cn(
            itemClass,
            "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
