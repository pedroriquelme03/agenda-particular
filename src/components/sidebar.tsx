"use client";

import {
  FileText,
  Mic,
  ImageIcon,
  Link2,
  LayoutDashboard,
  Home,
  Settings,
  KanbanSquare,
} from "lucide-react";
import type { EntryType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { InstallButton } from "@/components/pwa";

export type View = "entries" | "trello";

interface SidebarProps {
  view: View;
  filter: EntryType | "all";
  onFilterChange: (filter: EntryType | "all") => void;
  onViewChange: (view: View) => void;
  onSettingsClick: () => void;
  trelloConnected: boolean;
  open: boolean;
  onClose: () => void;
  onHome?: () => void;
}

const filters = [
  { value: "all" as const, label: "Tudo", icon: LayoutDashboard },
  { value: "text" as const, label: "Textos", icon: FileText },
  { value: "voice" as const, label: "Voz", icon: Mic },
  { value: "image" as const, label: "Imagens", icon: ImageIcon },
  { value: "link" as const, label: "Links", icon: Link2 },
];

export function Sidebar({
  view,
  filter,
  onFilterChange,
  onViewChange,
  onSettingsClick,
  trelloConnected,
  open,
  onClose,
  onHome,
}: SidebarProps) {
  return (
    <>
    {open && (
      <div
        className="fixed inset-0 z-30 bg-black/40 md:hidden"
        onClick={onClose}
      />
    )}
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-60 border-r bg-background flex flex-col h-full transition-transform md:static md:translate-x-0 md:bg-muted/30",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold tracking-tight">Minha Agenda</h1>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {onHome && (
          <button
            onClick={() => {
              onClose();
              onHome();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            Início
          </button>
        )}
        {filters.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => {
              onViewChange("entries");
              onFilterChange(value);
              onClose();
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

        {trelloConnected && (
          <>
            <Separator className="my-2" />
            <button
              onClick={() => {
                onViewChange("trello");
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                view === "trello"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <KanbanSquare className="h-4 w-4" />
              Quadros Trello
            </button>
          </>
        )}
      </nav>

      <div className="p-2 border-t space-y-1">
        <InstallButton />
        <button
          onClick={() => {
            onSettingsClick();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Config Trello
        </button>
      </div>
    </aside>
    </>
  );
}
