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
import { OfflineBanner } from "@/components/pwa";
import { Menu } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setTrelloConnected(isConfigured());
  }, []);

  const reminders = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.is_reminder &&
          e.reminder_date &&
          new Date(e.reminder_date) > new Date()
      ),
    [entries]
  );

  return (
    <div className="flex h-full w-full">
      <Sidebar
        view={view}
        filter={filter}
        onFilterChange={setFilter}
        onViewChange={setView}
        onSettingsClick={() => setTrelloConfigOpen(true)}
        trelloConnected={trelloConnected}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <OfflineBanner />
        {view === "entries" ? (
          <>
            <header className="border-b px-4 md:px-6 py-4 flex items-center gap-3 md:gap-4">
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu"
                className="md:hidden -ml-1 p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex-1">
                <SearchBar value={search} onChange={setSearch} />
              </div>
              {reminders.length > 0 && (
                <span className="hidden sm:inline text-xs text-muted-foreground whitespace-nowrap">
                  {reminders.length} lembrete{reminders.length > 1 ? "s" : ""} pendente{reminders.length > 1 ? "s" : ""}
                </span>
              )}
            </header>

            <ScrollArea className="flex-1">
              <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
                <EntryForm
                  onCreated={() => refetch()}
                  createEntry={createEntry}
                />

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
          </>
        ) : (
          <>
            <header className="border-b px-4 md:px-6 py-4 flex items-center gap-3">
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu"
                className="md:hidden -ml-1 p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
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
