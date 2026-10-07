"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addMonths, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Archive,
  ArrowDownUp,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Grid3x3,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/confirm-delete";
import { SwipeToArchive } from "@/components/swipe-to-archive";
import { Toast, type ToastMessage } from "@/components/toast";
import { cn } from "@/lib/utils";

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  // When the item was registered; orders the "everything" list.
  createdAt?: Date;
  // False when the end was not informed; endTime is then only a placeholder.
  hasEnd?: boolean;
  color: string;
  category?: string;
  // The user's own category for the item, when the host app has them.
  categoryId?: string | null;
  tags?: string[];
  // Whether the date can be changed (dragging or editing).
  movable?: boolean;
  // The item has a day but no time of day (a task deadline).
  dateOnly?: boolean;
  // The item is a moment, not a period: no end time to set (a task deadline).
  fixedDuration?: boolean;
  // Whether it can be checked off as done, and whether it already was.
  checkable?: boolean;
  done?: boolean;
  // Archived items only show when the "archived" filter is on.
  archived?: boolean;
}

export interface EventDraft {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date | null;
  categoryId: string | null;
}

type CalendarView = "month" | "week" | "day" | "list";
type ColorClasses = { name: string; value: string; bg: string; text: string };

export interface EventManagerProps {
  events: Event[];
  onEventCreate?: (event: EventDraft) => void;
  onEventUpdate?: (id: string, event: Partial<Event>) => void;
  onEventDelete?: (id: string) => void;
  onEventToggleDone?: (id: string, done: boolean) => void;
  onEventArchive?: (id: string, archive: boolean) => void;
  categories?: string[];
  colors?: ColorClasses[];
  defaultView?: CalendarView;
  // Shown in the dialog for items that can have a category.
  renderCategoryPicker?: (
    value: string | null,
    onChange: (id: string | null) => void
  ) => React.ReactNode;
  className?: string;
}

const defaultColors: ColorClasses[] = [
  { name: "Amarelo", value: "yellow", bg: "bg-yellow-500", text: "text-yellow-700" },
  { name: "Cinza", value: "gray", bg: "bg-neutral-500", text: "text-neutral-700" },
  { name: "Azul", value: "blue", bg: "bg-blue-500", text: "text-blue-700" },
  { name: "Verde", value: "green", bg: "bg-green-500", text: "text-green-700" },
  { name: "Roxo", value: "purple", bg: "bg-purple-500", text: "text-purple-700" },
  { name: "Laranja", value: "orange", bg: "bg-orange-500", text: "text-orange-700" },
  { name: "Rosa", value: "pink", bg: "bg-pink-500", text: "text-pink-700" },
  { name: "Vermelho", value: "red", bg: "bg-red-500", text: "text-red-700" },
];

const views: { value: CalendarView; label: string; icon: React.ElementType }[] = [
  { value: "month", label: "Mês", icon: Calendar },
  { value: "week", label: "Semana", icon: Grid3x3 },
  { value: "day", label: "Dia", icon: Clock },
  { value: "list", label: "Lista", icon: List },
];

const formatTime = (date: Date) => format(date, "HH:mm");

// Value for <input type="datetime-local">, in local time.
const toInputValue = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

function nextFullHour() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

const HOUR_MS = 60 * 60 * 1000;

// Same calendar day as the one given, at the "HH:mm" given.
function withTime(day: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

const timeRange = (event: Event) =>
  event.dateOnly
    ? "Prazo"
    : event.hasEnd
    ? formatTime(event.startTime) + " – " + formatTime(event.endTime)
    : formatTime(event.startTime);

// Whether the event occupies this hour cell: 09:00–12:00 fills 9, 10 and 11.
function coversHour(event: Event, day: Date, hour: number) {
  if (!isSameDay(event.startTime, day)) return false;
  const first = event.startTime.getHours();
  if (!event.hasEnd) return hour === first;
  const lastMoment = new Date(event.endTime.getTime() - 1);
  const last = isSameDay(lastMoment, day) ? lastMoment.getHours() : 23;
  return hour >= first && hour <= last;
}

// Start time suggested for a new appointment on a given day.
function defaultTimeOn(day: Date) {
  if (isSameDay(day, new Date())) return nextFullHour();
  const date = new Date(day);
  date.setHours(9, 0, 0, 0);
  return date;
}

export function EventManager({
  events,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onEventToggleDone,
  onEventArchive,
  categories = [],
  colors = defaultColors,
  defaultView = "month",
  renderCategoryPicker,
  className,
}: EventManagerProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>(defaultView);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState<EventDraft | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // Day tapped in the month grid; its items are listed below the calendar.
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  // Off: everything, with done items marked as such. On: only the done ones.
  const [showDone, setShowDone] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  // Order of the full list. "added": last registered first. "date": by the
  // item's own date, earliest first.
  const [listSort, setListSort] = useState<"added" | "date">("added");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const dayPanelRef = useRef<HTMLDivElement>(null);

  // The day's list sits below the month grid, so bring it into view when a day is tapped.
  useEffect(() => {
    if (selectedDay) {
      dayPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedDay]);

  const toggleDone = onEventToggleDone
    ? (id: string, done: boolean) => {
        onEventToggleDone(id, done);
        setToast({
          id: Date.now(),
          text: done ? "Marcado como concluído" : "Reaberto",
          ...(done && {
            actionLabel: "Desfazer",
            onAction: () => {
              onEventToggleDone(id, false);
              setToast(null);
            },
          }),
        });
      }
    : undefined;

  const isDialogOpen = newEvent !== null || selectedEvent !== null;

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!!event.archived !== showArchived) return false;
      if (showDone && !event.done) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.category?.toLowerCase().includes(query) ||
          event.tags?.some((tag) => tag.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      if (
        selectedCategories.length > 0 &&
        (!event.category || !selectedCategories.includes(event.category))
      ) {
        return false;
      }

      return true;
    });
  }, [events, searchQuery, selectedCategories, showDone, showArchived]);

  const endBeforeStart = newEvent
    ? !!newEvent.endTime && newEvent.endTime <= newEvent.startTime
    : !!selectedEvent?.hasEnd && selectedEvent.endTime <= selectedEvent.startTime;

  const closeDialog = () => {
    setNewEvent(null);
    setSelectedEvent(null);
  };

  const handleCreateEvent = () => {
    if (!newEvent || !newEvent.title.trim() || endBeforeStart) return;
    onEventCreate?.({ ...newEvent, title: newEvent.title.trim() });
    closeDialog();
  };

  const handleUpdateEvent = () => {
    if (!selectedEvent || endBeforeStart) return;
    onEventUpdate?.(selectedEvent.id, selectedEvent);
    closeDialog();
  };

  const archiveEvent = onEventArchive
    ? (event: Event) => {
        const archive = !event.archived;
        onEventArchive(event.id, archive);
        setToast({
          id: Date.now(),
          text: archive ? "Arquivado" : "Desarquivado",
          ...(archive && {
            actionLabel: "Desfazer",
            onAction: () => {
              onEventArchive(event.id, false);
              setToast(null);
            },
          }),
        });
      }
    : undefined;

  // Deleting asks first: the details close and the confirmation takes their place.
  const requestDelete = (event: Event) => {
    setDeleteTarget(event);
    closeDialog();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onEventDelete?.(deleteTarget.id);
    setDeleteTarget(null);
    setToast({ id: Date.now(), text: "Apagado" });
  };

  const handleDrop = useCallback(
    (date: Date, hour?: number) => {
      if (!draggedEvent) return;

      const duration =
        draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime();
      const newStartTime = new Date(date);
      if (hour !== undefined) {
        newStartTime.setHours(hour, 0, 0, 0);
      } else {
        // Dropped on a day of the month grid: keep the original time of day.
        newStartTime.setHours(
          draggedEvent.startTime.getHours(),
          draggedEvent.startTime.getMinutes(),
          0,
          0
        );
      }

      onEventUpdate?.(draggedEvent.id, {
        startTime: newStartTime,
        endTime: new Date(newStartTime.getTime() + duration),
      });
      setDraggedEvent(null);
    },
    [draggedEvent, onEventUpdate]
  );

  // Jumps the calendar to a chosen date and opens that day's items.
  const goToDate = (date: Date) => {
    setCurrentDate(date);
    setSelectedDay(date);
    // The full list has no notion of a current day.
    if (view === "list") setView("day");
  };

  // The arrows always move a month at a time, whatever the view.
  const navigateDate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => addMonths(prev, direction === "next" ? 1 : -1));
    // The day picked before belongs to the month being left.
    setSelectedDay(null);
    // The full list has no month to move through.
    if (view === "list") setView("month");
  };

  const getColorClasses = useCallback(
    (colorValue: string) =>
      colors.find((c) => c.value === colorValue) || colors[0],
    [colors]
  );

  const viewProps = {
    currentDate,
    events: filteredEvents,
    onEventClick: setSelectedEvent,
    onDragStart: setDraggedEvent,
    onDragEnd: () => setDraggedEvent(null),
    getColorClasses,
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold capitalize sm:text-2xl">
            {view === "month" && format(currentDate, "MMMM yyyy", { locale: ptBR })}
            {view === "week" &&
              `Semana de ${format(currentDate, "d 'de' MMM", { locale: ptBR })}`}
            {view === "day" &&
              format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            {view === "list" && "Tudo"}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate("prev")}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {/* The native date picker sits invisibly over the label, so tapping it opens the picker. */}
            <div className="relative">
              <Button variant="outline" size="sm" tabIndex={-1}>
                <Calendar className="h-4 w-4" />
                {isSameDay(selectedDay ?? currentDate, new Date())
                  ? "Hoje"
                  : format(selectedDay ?? currentDate, "dd/MM")}
              </Button>
              <input
                type="date"
                aria-label="Escolher data"
                // Desktop browsers only open the picker from the small icon otherwise.
                onClick={(e) => e.currentTarget.showPicker?.()}
                value={format(selectedDay ?? currentDate, "yyyy-MM-dd")}
                onChange={(e) => {
                  // Clearing the field goes back to today.
                  const date = e.target.value
                    ? new Date(e.target.value + "T00:00")
                    : new Date();
                  if (!Number.isNaN(date.getTime())) goToDate(date);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate("next")}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1 rounded-lg border bg-background p-1 lg:flex-none">
            {views.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={view === value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView(value)}
                className="flex-1"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>

          {onEventCreate && (
            <Button
              onClick={() =>
                setNewEvent({
                  title: "",
                  description: "",
                  startTime: nextFullHour(),
                  endTime: null,
                  categoryId: null,
                })
              }
            >
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar no calendário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {(onEventToggleDone || onEventArchive || view === "list") && (
          <div className="flex flex-wrap items-center gap-2">
            {onEventToggleDone && (
              <Badge
                variant={showDone ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setShowDone((prev) => !prev)}
              >
                <Check className="h-3 w-3" />
                Concluídos
              </Badge>
            )}
            {onEventArchive && (
              <Badge
                variant={showArchived ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setShowArchived((prev) => !prev)}
              >
                <Archive className="h-3 w-3" />
                Arquivados
              </Badge>
            )}
            {view === "list" && (
              <span className="ml-auto flex items-center gap-2">
                <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge
                  variant={listSort === "added" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setListSort("added")}
                >
                  Adição
                </Badge>
                <Badge
                  variant={listSort === "date" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setListSort("date")}
                >
                  Data
                </Badge>
              </span>
            )}
          </div>
        )}

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category);
              return (
                <Badge
                  key={category}
                  variant={isSelected ? "default" : "outline"}
                  className="shrink-0 cursor-pointer"
                  onClick={() =>
                    setSelectedCategories((prev) =>
                      isSelected
                        ? prev.filter((c) => c !== category)
                        : [...prev, category]
                    )
                  }
                >
                  {category}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {view === "month" && (
        <>
          <MonthView
            {...viewProps}
            onDrop={handleDrop}
            selectedDay={selectedDay}
            onDayClick={setSelectedDay}
          />
          {selectedDay && (
            <div ref={dayPanelRef} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold capitalize">
                  {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                {onEventCreate && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setNewEvent({
                        title: "",
                        description: "",
                        startTime: defaultTimeOn(selectedDay),
                        endTime: null,
                        categoryId: null,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Novo compromisso
                  </Button>
                )}
              </div>
              <ListView
                events={filteredEvents.filter((event) =>
                  isSameDay(event.startTime, selectedDay)
                )}
                onEventClick={setSelectedEvent}
                onToggleDone={toggleDone}
                onArchive={archiveEvent}
                getColorClasses={getColorClasses}
                singleDay
                emptyText="Nada registrado neste dia"
                ascending
              />
            </div>
          )}
        </>
      )}
      {view === "week" && <WeekView {...viewProps} onDrop={handleDrop} />}
      {view === "day" && <DayView {...viewProps} onDrop={handleDrop} />}
      {view === "list" && (
        <ListView
          events={filteredEvents}
          onEventClick={setSelectedEvent}
          onToggleDone={toggleDone}
                onArchive={archiveEvent}
          getColorClasses={getColorClasses}
          byCreation={listSort === "added"}
          ascending
        />
      )}

      {/* Event Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {newEvent ? "Novo compromisso" : "Detalhes"}
            </DialogTitle>
            <DialogDescription>
              {newEvent
                ? "Adicione um compromisso ao calendário"
                : selectedEvent?.category}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Título</Label>
              <Input
                id="event-title"
                value={(newEvent ? newEvent.title : selectedEvent?.title) ?? ""}
                onChange={(e) =>
                  newEvent
                    ? setNewEvent({ ...newEvent, title: e.target.value })
                    : setSelectedEvent((prev) =>
                        prev ? { ...prev, title: e.target.value } : null
                      )
                }
                placeholder="Título"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Descrição</Label>
              <Textarea
                id="event-description"
                value={
                  (newEvent
                    ? newEvent.description
                    : selectedEvent?.description) ?? ""
                }
                onChange={(e) =>
                  newEvent
                    ? setNewEvent({ ...newEvent, description: e.target.value })
                    : setSelectedEvent((prev) =>
                        prev ? { ...prev, description: e.target.value } : null
                      )
                }
                placeholder="Descrição ou local"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-start">
                {!newEvent && selectedEvent?.dateOnly ? "Prazo" : "Início"}
              </Label>
              <Input
                id="event-start"
                type={
                  !newEvent && selectedEvent?.dateOnly ? "date" : "datetime-local"
                }
                disabled={!newEvent && !selectedEvent?.movable}
                value={
                  newEvent
                    ? toInputValue(newEvent.startTime)
                    : selectedEvent
                      ? selectedEvent.dateOnly
                        ? format(selectedEvent.startTime, "yyyy-MM-dd")
                        : toInputValue(selectedEvent.startTime)
                      : ""
                }
                onChange={(e) => {
                  // A bare "yyyy-MM-dd" would parse as UTC; add the time to keep it local.
                  const date =
                    !newEvent && selectedEvent?.dateOnly
                      ? new Date(
                          e.target.value + "T" + formatTime(selectedEvent.startTime)
                        )
                      : new Date(e.target.value);
                  if (Number.isNaN(date.getTime())) return;
                  if (newEvent) {
                    setNewEvent({
                      ...newEvent,
                      startTime: date,
                      endTime: newEvent.endTime
                        ? withTime(date, formatTime(newEvent.endTime))
                        : null,
                    });
                  } else {
                    setSelectedEvent((prev) =>
                      prev
                        ? {
                            ...prev,
                            startTime: date,
                            endTime: new Date(
                              date.getTime() +
                                (prev.endTime.getTime() - prev.startTime.getTime())
                            ),
                          }
                        : null
                    );
                  }
                }}
              />
            </div>

            {(newEvent || (selectedEvent?.movable && !selectedEvent.fixedDuration)) && (
              <div className="space-y-2">
                <Label htmlFor="event-end">Término (opcional)</Label>
                <Input
                  id="event-end"
                  type="time"
                  value={
                    newEvent
                      ? newEvent.endTime
                        ? formatTime(newEvent.endTime)
                        : ""
                      : selectedEvent?.hasEnd
                        ? formatTime(selectedEvent.endTime)
                        : ""
                  }
                  onChange={(e) => {
                    const time = e.target.value;
                    if (newEvent) {
                      setNewEvent({
                        ...newEvent,
                        endTime: time ? withTime(newEvent.startTime, time) : null,
                      });
                    } else {
                      setSelectedEvent((prev) =>
                        prev
                          ? {
                              ...prev,
                              hasEnd: !!time,
                              endTime: time
                                ? withTime(prev.startTime, time)
                                : new Date(prev.startTime.getTime() + HOUR_MS),
                            }
                          : null
                      );
                    }
                  }}
                />
                {endBeforeStart && (
                  <p className="text-sm text-destructive">
                    O término precisa ser depois do início.
                  </p>
                )}
              </div>
            )}

            {renderCategoryPicker && (newEvent || selectedEvent?.checkable) && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                {renderCategoryPicker(
                  newEvent ? newEvent.categoryId : (selectedEvent?.categoryId ?? null),
                  (id) =>
                    newEvent
                      ? setNewEvent({ ...newEvent, categoryId: id })
                      : setSelectedEvent((prev) =>
                          prev ? { ...prev, categoryId: id } : null
                        )
                )}
              </div>
            )}

            {!newEvent && selectedEvent?.tags && selectedEvent.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedEvent.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            {!newEvent && onEventDelete && (
              <Button
                variant="destructive"
                onClick={() => selectedEvent && requestDelete(selectedEvent)}
              >
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={newEvent ? handleCreateEvent : handleUpdateEvent}
              disabled={(!!newEvent && !newEvent.title.trim()) || endBeforeStart}
            >
              {newEvent ? "Criar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        label={deleteTarget ? deleteTarget.title : null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <Toast
        toast={toast}
        onDismiss={(id) =>
          setToast((current) => (current?.id === id ? null : current))
        }
      />
    </div>
  );
}

interface ViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onDragStart: (event: Event) => void;
  onDragEnd: () => void;
  getColorClasses: (color: string) => ColorClasses;
}

function EventCard({
  event,
  onEventClick,
  onDragStart,
  onDragEnd,
  getColorClasses,
  variant = "default",
  continuation = false,
}: Omit<ViewProps, "currentDate" | "events"> & {
  event: Event;
  variant?: "default" | "compact" | "detailed";
  // An hour the event runs through after its first one: colored block, no text.
  continuation?: boolean;
}) {
  const colorClasses = getColorClasses(event.color);
  const dragProps = {
    draggable: !!event.movable,
    onDragStart: () => onDragStart(event),
    onDragEnd,
    onClick: () => onEventClick(event),
  };

  if (continuation) {
    return (
      <div
        {...dragProps}
        title={timeRange(event) + " " + event.title}
        className={cn(
          "cursor-pointer rounded",
          event.done ? "opacity-40" : "opacity-80",
          variant === "detailed" ? "min-h-14 sm:min-h-16" : "min-h-10 sm:min-h-14",
          colorClasses.bg
        )}
      />
    );
  }

  if (variant === "detailed") {
    return (
      <div
        {...dragProps}
        className={cn(
          "cursor-pointer rounded-lg p-3 text-white transition-shadow hover:shadow-lg",
          event.done && "opacity-50 line-through",
          colorClasses.bg
        )}
      >
        <div className="font-semibold">{event.title}</div>
        {event.description && (
          <div className="mt-1 text-sm opacity-90 line-clamp-2">
            {event.description}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
          <Clock className="h-3 w-3" />
          {timeRange(event)}
          {event.category && <span>· {event.category}</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      {...dragProps}
      title={timeRange(event) + " " + event.title}
      className={cn(
        "cursor-pointer truncate rounded text-xs font-medium text-white transition-shadow hover:shadow-md",
        variant === "compact" ? "px-1 py-0.5 sm:px-1.5" : "px-2 py-1",
        event.done && "opacity-50 line-through",
        colorClasses.bg
      )}
    >
      {event.title}
    </div>
  );
}

function MonthView({
  currentDate,
  events,
  onDrop,
  selectedDay,
  onDayClick,
  ...cardProps
}: ViewProps & {
  onDrop: (date: Date) => void;
  selectedDay: Date | null;
  onDayClick: (date: Date) => void;
}) {
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days = Array.from({ length: 42 }, (_, i) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    return day;
  });
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div
            key={day}
            className="border-r p-2 text-center text-xs font-medium last:border-r-0 sm:text-sm"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = events.filter((event) =>
            isSameDay(event.startTime, day)
          );
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-20 min-w-0 cursor-pointer border-b border-r p-1 transition-colors hover:bg-accent/50 nth-[7n]:border-r-0 sm:min-h-24 sm:p-2",
                !isCurrentMonth && "bg-muted/30",
                selectedDay && isSameDay(day, selectedDay) && "bg-accent"
              )}
              onClick={() => onDayClick(day)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(day)}
            >
              <div
                className={cn(
                  "mb-1 flex h-5 w-5 items-center justify-center rounded-full text-xs sm:h-6 sm:w-6 sm:text-sm",
                  isSameDay(day, today) &&
                    "bg-primary text-primary-foreground font-semibold"
                )}
              >
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    variant="compact"
                    {...cardProps}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground sm:text-xs">
                    +{dayEvents.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const hours = Array.from({ length: 24 }, (_, i) => i);

function WeekView({
  currentDate,
  events,
  onDrop,
  ...cardProps
}: ViewProps & { onDrop: (date: Date, hour: number) => void }) {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-8 border-b">
        <div className="border-r p-2 text-center text-xs font-medium sm:text-sm">
          Hora
        </div>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="border-r p-2 text-center text-xs font-medium capitalize last:border-r-0 sm:text-sm"
          >
            <div className="hidden sm:block">
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div className="sm:hidden">{format(day, "EEEEE", { locale: ptBR })}</div>
            <div className="text-[10px] text-muted-foreground sm:text-xs">
              {format(day, "d/MM")}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-8">
        {hours.map((hour) => (
          <Fragment key={hour}>
            <div className="border-b border-r p-1 text-[10px] text-muted-foreground sm:p-2 sm:text-xs">
              {hour.toString().padStart(2, "0")}:00
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="min-h-12 min-w-0 border-b border-r p-0.5 transition-colors hover:bg-accent/50 last:border-r-0 sm:min-h-16 sm:p-1"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(day, hour)}
              >
                <div className="space-y-1">
                  {events
                    .filter((event) => coversHour(event, day, hour))
                    .map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        continuation={event.startTime.getHours() !== hour}
                        {...cardProps}
                      />
                    ))}
                </div>
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// The day starts at 5h; the small hours come last, as the end of the day.
const dayPeriods = [
  { label: "Manhã", hours: [5, 6, 7, 8, 9, 10, 11] },
  { label: "Tarde", hours: [12, 13, 14, 15, 16, 17] },
  { label: "Noite", hours: [18, 19, 20, 21, 22, 23] },
  { label: "Madrugada", hours: [0, 1, 2, 3, 4] },
];

function DayView({
  currentDate,
  events,
  onDrop,
  ...cardProps
}: ViewProps & { onDrop: (date: Date, hour: number) => void }) {
  const dayEvents = events.filter((event) =>
    isSameDay(event.startTime, currentDate)
  );

  return (
    <div className="space-y-5">
      {dayPeriods.map((period) => (
        <section key={period.label} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {period.label}
          </h3>
          <div className="overflow-hidden rounded-xl border bg-card">
      {period.hours.map((hour) => (
        <div
          key={hour}
          className="flex border-b last:border-b-0"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(currentDate, hour)}
        >
          <div className="w-14 shrink-0 border-r p-2 text-xs text-muted-foreground sm:w-20 sm:p-3 sm:text-sm">
            {hour.toString().padStart(2, "0")}:00
          </div>
          <div className="min-h-16 min-w-0 flex-1 p-1 transition-colors hover:bg-accent/50 sm:min-h-20 sm:p-2">
            <div className="space-y-2">
              {dayEvents
                .filter((event) => coversHour(event, currentDate, hour))
                .map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    variant="detailed"
                    continuation={event.startTime.getHours() !== hour}
                    {...cardProps}
                  />
                ))}
            </div>
          </div>
        </div>
      ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ListView({
  events,
  onEventClick,
  getColorClasses,
  onToggleDone,
  onArchive,
  singleDay = false,
  emptyText = "Nada encontrado",
  ascending = false,
  byCreation = false,
}: Pick<ViewProps, "events" | "onEventClick" | "getColorClasses"> & {
  onToggleDone?: (id: string, done: boolean) => void;
  // Dragging a card sideways archives it (or restores an archived one).
  onArchive?: (event: Event) => void;
  // The list is for one day whose title is shown elsewhere: no date headers.
  singleDay?: boolean;
  emptyText?: string;
  ascending?: boolean;
  // One flat list, last registered first; each item then shows its own date.
  byCreation?: boolean;
}) {
  const registeredAt = (event: Event) =>
    (event.createdAt ?? event.startTime).getTime();

  // Grouped by day; latest date first unless `ascending`.
  const groups: { date: Date; events: Event[] }[] = [];
  [...events]
    .sort((a, b) =>
      byCreation
        ? registeredAt(b) - registeredAt(a)
        : (a.startTime.getTime() - b.startTime.getTime()) * (ascending ? 1 : -1)
    )
    .forEach((event) => {
      const last = groups[groups.length - 1];
      if (last && (byCreation || isSameDay(last.date, event.startTime))) {
        last.events.push(event);
      } else {
        groups.push({ date: event.startTime, events: [event] });
      }
    });

  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.date.toISOString()} className="space-y-3">
            {!singleDay && !byCreation && (
              <h3 className="text-xs font-semibold capitalize text-muted-foreground sm:text-sm">
                {format(group.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h3>
            )}
            <div className="space-y-2">
              {group.events.map((event) => (
                <SwipeToArchive
                  key={event.id}
                  disabled={!onArchive}
                  archived={event.archived}
                  onArchive={() => onArchive?.(event)}
                >
                <div
                  onClick={() => onEventClick(event)}
                  className={cn(
                    "cursor-pointer rounded-lg border bg-card p-3 transition-shadow hover:shadow-md sm:p-4",
                    event.done && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    {event.checkable && onToggleDone ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleDone(event.id, !event.done);
                        }}
                        aria-label={
                          event.done ? "Desmarcar como feito" : "Marcar como feito"
                        }
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          event.done
                            ? "border-foreground bg-foreground text-background"
                            : "border-muted-foreground/50"
                        )}
                      >
                        {event.done && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <div
                        className={cn(
                          "mt-1 h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3",
                          getColorClasses(event.color).bg
                        )}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className={cn(
                            "truncate text-sm font-semibold sm:text-base",
                            event.done && "text-muted-foreground line-through"
                          )}
                        >
                          {event.title}
                        </h4>
                        {event.category && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {event.category}
                          </Badge>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 sm:text-sm">
                          {event.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground sm:text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {byCreation && format(event.startTime, "dd/MM") + " · "}
                          {timeRange(event)}
                        </span>
                        {event.tags
                          ?.filter(
                            // The category badge already says it.
                            (tag) =>
                              tag.toLowerCase() !== event.category?.toLowerCase()
                          )
                          .map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                </SwipeToArchive>
              ))}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div
            className={cn(
              "text-center text-sm text-muted-foreground sm:text-base",
              singleDay ? "py-4" : "py-12"
            )}
          >
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}
