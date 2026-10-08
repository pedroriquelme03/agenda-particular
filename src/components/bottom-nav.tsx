"use client";

import {
  CalendarDays,
  Ellipsis,
  Home,
  LayoutDashboard,
  ListTodo,
} from "lucide-react";
import type { View } from "@/components/sidebar";
import { cn } from "@/lib/utils";

export type Page = "home" | View;

interface BottomNavProps {
  active: Page;
  onNavigate: (page: Page) => void;
  // Opens the menu with every module.
  onMore: () => void;
  showHome: boolean;
  className?: string;
}

// The pages used most. Everything else is in the menu behind "Mais".
const pages = [
  { value: "home" as const, label: "Início", icon: Home },
  { value: "calendar" as const, label: "Calendário", icon: CalendarDays },
  { value: "tasks" as const, label: "Tarefas", icon: ListTodo },
  { value: "entries" as const, label: "Anotações", icon: LayoutDashboard },
];

const itemClass =
  "flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors";

export function BottomNav({
  active,
  onNavigate,
  onMore,
  showHome,
  className,
}: BottomNavProps) {
  const visible = pages.filter(({ value }) => value !== "home" || showHome);
  // On a page that is not in the bar, "Mais" is the one lit up.
  const moreActive = !visible.some(({ value }) => value === active);

  return (
    <nav
      className={cn(
        "flex shrink-0 border-t bg-background pb-[calc(15px+env(safe-area-inset-bottom))]",
        className
      )}
    >
      {visible.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onNavigate(value)}
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
        onClick={onMore}
        className={cn(
          itemClass,
          moreActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <Ellipsis className="h-5 w-5" strokeWidth={moreActive ? 2.5 : 2} />
        Mais
      </button>
    </nav>
  );
}
