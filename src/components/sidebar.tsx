"use client";

import { useState } from "react";
import {
  Link2,
  LayoutDashboard,
  CalendarDays,
  Home,
  House,
  Lightbulb,
  ListTodo,
  Wallet,
  Settings,
  LogOut,
  KanbanSquare,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Users,
  Clapperboard,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InstallButton } from "@/components/pwa";

export type View =
  | "entries"
  | "calendar"
  | "links"
  | "tasks"
  | "meetings"
  | "content"
  | "ideas"
  | "finance"
  | "house"
  | "trello";

interface MenuProps {
  // The page on screen; null on the home screen, which is not one of these.
  view: View | null;
  onViewChange: (view: View) => void;
  onSettingsClick: () => void;
  onProfileClick: () => void;
  onSignOut: () => void;
  trelloConnected: boolean;
}

const pages = [
  { value: "entries" as const, label: "Anotações", icon: LayoutDashboard },
  { value: "calendar" as const, label: "Calendário", icon: CalendarDays },
  { value: "tasks" as const, label: "Tarefas", icon: ListTodo },
  { value: "meetings" as const, label: "Reuniões", icon: Users },
  { value: "links" as const, label: "Links", icon: Link2 },
  { value: "ideas" as const, label: "Ideias", icon: Lightbulb },
  { value: "finance" as const, label: "Financeiro", icon: Wallet },
  { value: "content" as const, label: "Conteúdo", icon: Clapperboard },
  { value: "house" as const, label: "Casa", icon: House },
  { value: "trello" as const, label: "Quadros Trello", icon: KanbanSquare },
];

const itemClass =
  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors";
const idleClass = "text-muted-foreground hover:bg-muted hover:text-foreground";

// The list of modules and the account actions, shared by the desktop sidebar
// and the menu that "Mais" opens on small screens.
function MenuItems({
  view,
  onViewChange,
  onSettingsClick,
  onProfileClick,
  onSignOut,
  trelloConnected,
  onHome,
}: MenuProps & { onHome?: () => void }) {
  return (
    <>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {onHome && (
          <button
            onClick={onHome}
            className={cn(
              itemClass,
              view === null ? "bg-primary text-primary-foreground" : idleClass
            )}
          >
            <Home className="h-4 w-4" />
            Início
          </button>
        )}
        {pages
          .filter(({ value }) => value !== "trello" || trelloConnected)
          .map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onViewChange(value)}
              className={cn(
                itemClass,
                view === value ? "bg-primary text-primary-foreground" : idleClass
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
      </nav>

      <div className="p-2 border-t space-y-1">
        <InstallButton />
        <button onClick={onProfileClick} className={cn(itemClass, idleClass)}>
          <UserRound className="h-4 w-4" />
          Perfil
        </button>
        <button onClick={onSettingsClick} className={cn(itemClass, idleClass)}>
          <Settings className="h-4 w-4" />
          Config Trello
        </button>
        <button onClick={onSignOut} className={cn(itemClass, idleClass)}>
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </>
  );
}

// Desktop only: small screens open the same menu from "Mais" in the bottom bar.
export function Sidebar(props: MenuProps) {
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
      <MenuItems {...props} />
    </aside>
  );
}

// The same menu as a drawer over the screen, for small screens. Choosing
// anything closes it.
export function MobileMenu({
  open,
  onClose,
  onHome,
  ...props
}: MenuProps & { open: boolean; onClose: () => void; onHome?: () => void }) {
  if (!open) return null;

  const closing =
    <Args extends unknown[]>(action: (...args: Args) => void) =>
    (...args: Args) => {
      onClose();
      action(...args);
    };

  return (
    // Absolute, not fixed: iOS tints the status bar with fixed layers at the top edge.
    <div className="absolute inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col border-r bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <h1 className="text-lg font-bold tracking-tight">Minha Agenda</h1>
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="-mr-2 p-2 rounded-md text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <MenuItems
          view={props.view}
          trelloConnected={props.trelloConnected}
          onViewChange={closing(props.onViewChange)}
          onSettingsClick={closing(props.onSettingsClick)}
          onProfileClick={closing(props.onProfileClick)}
          onSignOut={closing(props.onSignOut)}
          onHome={onHome && closing(onHome)}
        />
      </aside>
    </div>
  );
}
