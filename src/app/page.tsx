"use client";

import { useState, useMemo, useEffect } from "react";
import { Sidebar, type View } from "@/components/sidebar";
import { SearchBar } from "@/components/search-bar";
import { EntryForm } from "@/components/entry-form";
import { EntryCard } from "@/components/entry-card";
import { TrelloConfigDialog, TrelloSendDialog } from "@/components/trello-sync";
import { TrelloBoards } from "@/components/trello-boards";
import { useEntries } from "@/hooks/use-entries";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OfflineBanner, useStandalone } from "@/components/pwa";
import { NoteScreen, PwaHome } from "@/components/pwa-home";
import { BottomNav, type Page } from "@/components/bottom-nav";
import { CalendarView } from "@/components/calendar-view";
import { LinksView } from "@/components/links-view";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isConfigured } from "@/lib/trello";
import type { Entry } from "@/lib/types";

export default function Home() {
  const {
    entries,
    loading,
    filter,
    setFilter,
    search,
    setSearch,
    createEntry,
    updateEntry,
    deleteEntry,
    refetch,
  } = useEntries();

  const [view, setView] = useState<View>("entries");
  const [trelloConfigOpen, setTrelloConfigOpen] = useState(false);
  const [trelloSendEntry, setTrelloSendEntry] = useState<Entry | null>(null);
  const [trelloConnected, setTrelloConnected] = useState(false);
  const standalone = useStandalone();
  const [noteOpen, setNoteOpen] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);

  useEffect(() => {
    setTrelloConnected(isConfigured());
  }, []);

  // Calendar and links ignore the list's search; each page loads what it shows.
  const changeView = (next: View) => {
    if (next === "calendar" || next === "links") {
      setFilter(next === "links" ? "link" : "all");
      setSearch("");
    } else if (next === "entries" && view !== "entries") {
      setFilter("all");
    }
    setView(next);
  };

  const navigate = (page: Page) => {
    if (page === "home") {
      setShowAgenda(false);
    } else {
      changeView(page);
      setShowAgenda(true);
    }
  };

  const reminders = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.is_reminder &&
          !e.completed_at &&
          e.reminder_date &&
          new Date(e.reminder_date) > new Date()
      ),
    [entries]
  );

  // The installed app always has the bar; in a browser it replaces the sidebar on small screens.
  const bottomNav = (
    <BottomNav
      showHome={standalone}
      className={standalone ? undefined : "md:hidden"}
      active={standalone && !showAgenda ? "home" : view}
      onNavigate={navigate}
      trelloConnected={trelloConnected}
    />
  );

  if (standalone && !showAgenda) {
    return (
      <PwaHome
        createEntry={createEntry}
        onOpenLinks={() => navigate("links")}
        nav={bottomNav}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex min-h-0 w-full flex-1">
      <Sidebar
        view={view}
        filter={filter}
        onFilterChange={setFilter}
        onViewChange={changeView}
        onSettingsClick={() => setTrelloConfigOpen(true)}
        trelloConnected={trelloConnected}
      />

      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <OfflineBanner />
        {view === "entries" ? (
          <>
            <header className="border-b px-4 md:px-6 py-4 flex items-center gap-3 md:gap-4">
              <div className="flex-1">
                <SearchBar value={search} onChange={setSearch} />
              </div>
              {reminders.length > 0 && (
                <span className="hidden sm:inline text-xs text-muted-foreground whitespace-nowrap">
                  {reminders.length} lembrete{reminders.length > 1 ? "s" : ""} pendente{reminders.length > 1 ? "s" : ""}
                </span>
              )}
              <button
                onClick={() => setTrelloConfigOpen(true)}
                aria-label="Config Trello"
                className="md:hidden -mr-1 p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
            </header>

            <ScrollArea className="flex-1 min-h-0">
              <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
                <div className="hidden md:block">
                  <EntryForm
                    onCreated={() => refetch()}
                    createEntry={createEntry}
                  />
                </div>

                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Carregando...
                  </div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {search
                      ? "Nenhum resultado encontrado."
                      : "Nenhuma entrada ainda. Crie a primeira!"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        onDelete={deleteEntry}
                        onTrelloSend={
                          trelloConnected ? setTrelloSendEntry : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="md:hidden border-t px-4 py-3">
              <Button
                onClick={() => setNoteOpen(true)}
                className="h-12 w-full text-base"
              >
                <Plus className="h-4 w-4" />
                Nova entrada
              </Button>
            </div>
          </>
        ) : view === "calendar" ? (
          <>
            <header className="border-b px-4 md:px-6 py-4 flex items-center gap-3">
              <h2 className="text-lg font-semibold">Calendário</h2>
            </header>

            <ScrollArea className="flex-1 min-h-0">
              <div className="max-w-5xl mx-auto p-4 md:p-6">
                {loading && entries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Carregando...
                  </div>
                ) : (
                  <CalendarView
                    entries={entries}
                    createEntry={createEntry}
                    updateEntry={updateEntry}
                    deleteEntry={deleteEntry}
                  />
                )}
              </div>
            </ScrollArea>
          </>
        ) : view === "links" ? (
          <>
            <header className="border-b px-4 md:px-6 py-4 flex items-center gap-3">
              <h2 className="text-lg font-semibold">Links</h2>
            </header>

            <ScrollArea className="flex-1 min-h-0">
              <div className="max-w-2xl mx-auto p-4 md:p-6">
                <LinksView
                  entries={entries}
                  loading={loading}
                  createEntry={createEntry}
                  deleteEntry={deleteEntry}
                  onTrelloSend={trelloConnected ? setTrelloSendEntry : undefined}
                />
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            <header className="border-b px-4 md:px-6 py-4 flex items-center gap-3">
              <h2 className="text-lg font-semibold">Quadros do Trello</h2>
            </header>

            <ScrollArea className="flex-1">
              <div className="max-w-2xl mx-auto p-4 md:p-6">
                <TrelloBoards />
              </div>
            </ScrollArea>
          </>
        )}
      </main>
      </div>

      {bottomNav}

      {noteOpen && (
        <NoteScreen
          createEntry={createEntry}
          onCancel={() => setNoteOpen(false)}
          onSaved={() => setNoteOpen(false)}
        />
      )}

      <TrelloConfigDialog
        open={trelloConfigOpen}
        onOpenChange={(open) => {
          setTrelloConfigOpen(open);
          if (!open) setTrelloConnected(isConfigured());
        }}
      />

      <TrelloSendDialog
        entry={trelloSendEntry}
        open={!!trelloSendEntry}
        onOpenChange={(open) => {
          if (!open) setTrelloSendEntry(null);
        }}
        onSent={async (entryId, cardId) => {
          await updateEntry(entryId, { trello_card_id: cardId });
        }}
      />
    </div>
  );
}
