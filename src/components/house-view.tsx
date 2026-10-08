"use client";

import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ClipboardList,
  Plus,
  ShoppingCart,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDelete } from "@/components/confirm-delete";
import { FilterBar, passesFilters, useListFilters } from "@/components/filter-bar";
import { SwipeToArchive } from "@/components/swipe-to-archive";
import { useHouse } from "@/hooks/use-house";
import type { HouseItem, HouseKind, ServiceQuote } from "@/lib/types";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// "1.250,50" or "1250.50" -> 1250.5
function parseAmount(input: string) {
  const text = input.trim();
  if (!text) return null;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const sections: {
  kind: HouseKind;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  empty: string;
}[] = [
  {
    kind: "market",
    label: "Lista de mercado",
    icon: ShoppingCart,
    placeholder: "Ex.: Arroz",
    empty: "A lista de mercado está vazia.",
  },
  {
    kind: "chore",
    label: "Lista de afazeres",
    icon: ClipboardList,
    placeholder: "Ex.: Trocar a lâmpada da sala",
    empty: "Nenhum afazer na lista.",
  },
  {
    kind: "service",
    label: "Orçamento de serviços",
    icon: Wrench,
    placeholder: "Ex.: Pintura da fachada",
    empty: "Nenhum serviço para orçar.",
  },
];

type HouseState = ReturnType<typeof useHouse>;

export function HouseView() {
  const house = useHouse();
  const [open, setOpen] = useState<HouseKind | null>(null);

  const section = sections.find(({ kind }) => kind === open);
  if (section) {
    return (
      <HouseList
        key={section.kind}
        section={section}
        house={house}
        onBack={() => setOpen(null)}
      />
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 p-4 md:p-6">
        {sections.map(({ kind, label, icon: Icon }) => {
          const items = house.items.filter(
            (item) => item.kind === kind && !item.archived_at
          );
          const pending = items.filter((item) => !item.done).length;
          return (
            <button
              key={kind}
              onClick={() => setOpen(kind)}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-3xl border bg-secondary px-2 text-center text-secondary-foreground shadow-sm transition-transform active:scale-95"
            >
              <Icon className="h-9 w-9" />
              <span className="text-base font-semibold">{label}</span>
              <span className="text-xs text-muted-foreground">
                {items.length === 0
                  ? "Vazia"
                  : pending === 0
                    ? "Tudo feito"
                    : `${pending} pendente${pending > 1 ? "s" : ""}`}
              </span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function HouseList({
  section,
  house,
  onBack,
}: {
  section: (typeof sections)[number];
  house: HouseState;
  onBack: () => void;
}) {
  const { items: allItems, loading, addItem, updateItem, deleteItems } = house;
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  // These lists keep the order they were written in, so there is no sort.
  const filters = useListFilters();
  const items = allItems.filter(
    (item) =>
      item.kind === section.kind &&
      passesFilters(filters, { done: item.done, archived: !!item.archived_at })
  );
  const done = items.filter((item) => item.done);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || saving) return;
    setSaving(true);
    const added = await addItem(section.kind, text.trim());
    setSaving(false);
    if (added) setText("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 border-b px-2 py-2">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="p-2 text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold">
          {section.label}
        </h3>
        {done.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setClearing(true)}>
            Limpar marcados
          </Button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-2xl space-y-2 p-4 md:p-6">
          <FilterBar filters={filters} sort={false} className="pb-2" />
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {filters.showArchived ? "Nada arquivado aqui." : section.empty}
            </div>
          ) : (
            items.map((item) => (
              <SwipeToArchive
                key={item.id}
                archived={!!item.archived_at}
                onArchive={() =>
                  updateItem(item.id, {
                    archived_at: item.archived_at ? null : new Date().toISOString(),
                  })
                }
              >
              <div
                className={cn("rounded-lg border bg-card p-3", item.done && "opacity-60")}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateItem(item.id, { done: !item.done })}
                    aria-label={item.done ? "Desmarcar" : "Marcar como feito"}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      item.done
                        ? "border-foreground bg-foreground text-background"
                        : "border-muted-foreground/50"
                    )}
                  >
                    {item.done && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-sm font-medium [overflow-wrap:anywhere]",
                      item.done && "text-muted-foreground line-through"
                    )}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteItems([item.id])}
                    aria-label={`Remover ${item.text}`}
                    className="shrink-0 p-1 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {section.kind === "service" && (
                  <Quotes
                    item={item}
                    onChange={(quotes) => updateItem(item.id, { quotes })}
                  />
                )}
              </div>
              </SwipeToArchive>
            ))
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t px-4 py-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={section.placeholder}
          aria-label="Novo item"
          className="h-12 min-w-0 flex-1 text-base"
        />
        <Button
          type="submit"
          disabled={!text.trim() || saving}
          aria-label="Adicionar"
          className="h-12 w-12 shrink-0"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </form>

      <ConfirmDelete
        label={
          clearing
            ? `${done.length} ${done.length > 1 ? "itens marcados" : "item marcado"}`
            : null
        }
        onCancel={() => setClearing(false)}
        onConfirm={() => {
          setClearing(false);
          deleteItems(done.map((item) => item.id));
        }}
      />
    </div>
  );
}

// The quotes gathered for one service: "Orçamento 1", "Orçamento 2"... each
// with a value, and a mark on the one that was chosen.
function Quotes({
  item,
  onChange,
}: {
  item: HouseItem;
  onChange: (quotes: ServiceQuote[]) => void;
}) {
  const quotes = item.quotes ?? [];
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const parsedAmount = parseAmount(amount);
  const lowest = quotes.length > 1 ? Math.min(...quotes.map((q) => q.amount)) : null;

  const add = () => {
    if (parsedAmount === null) return;
    onChange([
      ...quotes,
      {
        id: crypto.randomUUID(),
        label: label.trim() || `Orçamento ${quotes.length + 1}`,
        amount: parsedAmount,
        chosen: false,
      },
    ]);
    setLabel("");
    setAmount("");
  };

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      {quotes.map((quote) => (
        <div key={quote.id} className="flex items-center gap-2">
          <button
            onClick={() =>
              // Choosing one quote unchooses the others; tapping it again clears it.
              onChange(
                quotes.map((other) => ({
                  ...other,
                  chosen: other.id === quote.id ? !other.chosen : false,
                }))
              )
            }
            aria-label={quote.chosen ? "Desmarcar escolhido" : "Marcar como escolhido"}
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
              quote.chosen
                ? "border-foreground bg-foreground text-background"
                : "border-muted-foreground/50"
            )}
          >
            {quote.chosen && <Check className="h-3 w-3" />}
          </button>
          <span className="min-w-0 flex-1 truncate text-sm">
            {quote.label}
            {quote.chosen && (
              <span className="text-xs text-muted-foreground"> · escolhido</span>
            )}
          </span>
          <span
            className={cn(
              "shrink-0 text-sm tabular-nums",
              quote.amount === lowest && "font-bold"
            )}
          >
            {currency.format(quote.amount)}
            {quote.amount === lowest && (
              <span className="text-xs font-normal text-muted-foreground"> · menor</span>
            )}
          </span>
          <button
            onClick={() => onChange(quotes.filter((other) => other.id !== quote.id))}
            aria-label={`Remover ${quote.label}`}
            className="shrink-0 p-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={`Orçamento ${quotes.length + 1}`}
          aria-label="Nome do orçamento"
          className="h-10 min-w-0 flex-1 text-base"
        />
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="0,00"
          aria-label="Valor em reais"
          className="h-10 w-24 shrink-0 text-base"
        />
        <button
          type="button"
          onClick={add}
          disabled={parsedAmount === null}
          aria-label="Adicionar orçamento"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-muted-foreground disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
