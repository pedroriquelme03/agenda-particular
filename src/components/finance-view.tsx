"use client";

import { useState } from "react";
import { addMonths, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Toast, type ToastMessage } from "@/components/toast";
import { useFinance } from "@/hooks/use-finance";
import type { FinanceItem, FinanceKind } from "@/lib/types";
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

// Months are compared as "yyyy-MM-01" strings, which sort like dates.
const monthKey = (date: Date) => format(startOfMonth(date), "yyyy-MM-dd");

// The database keeps the first month a fixed account no longer applies to; the
// screen talks about the last month it does. These convert between the two.
const lastMonthOf = (endMonth: string) =>
  format(addMonths(new Date(endMonth + "T00:00"), -1), "yyyy-MM");
const endMonthAfter = (lastMonth: string) =>
  monthKey(addMonths(new Date(lastMonth + "-01T00:00"), 1));

// A fixed account counts from its first month until it is ended; a sale only
// in its own month.
function appliesTo(item: FinanceItem, month: string) {
  if (item.kind === "sale") return item.month === month;
  return item.month <= month && (!item.end_month || month < item.end_month);
}

const total = (items: FinanceItem[]) =>
  items.reduce((sum, item) => sum + Number(item.amount), 0);

const nextMonth = (month: string) =>
  monthKey(addMonths(new Date(month + "T00:00"), 1));

// A fixed account left unsettled when its month ended carries over: it shows
// in the following months as overdue, once for each month still open.
interface Overdue {
  item: FinanceItem;
  months: string[];
}

// The months already over, before the one on screen, in which the account
// applied and was not settled.
function overdueMonths(item: FinanceItem, month: string, currentMonth: string) {
  let limit = month < currentMonth ? month : currentMonth;
  if (item.end_month && item.end_month < limit) limit = item.end_month;
  const months: string[] = [];
  for (let m = item.month; m < limit; m = nextMonth(m)) {
    if (!item.paid_months?.includes(m)) months.push(m);
  }
  return months;
}

const overdueTotal = (overdue: Overdue[]) =>
  overdue.reduce(
    (sum, { item, months }) => sum + Number(item.amount) * months.length,
    0
  );

export function FinanceView() {
  const { items, loading, addItem, deleteItem, endItem, setPaid } = useFinance();
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [deleteTarget, setDeleteTarget] = useState<FinanceItem | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const month = monthKey(monthDate);
  const inMonth = items.filter((item) => appliesTo(item, month));
  const byKind = (kind: FinanceKind) => inMonth.filter((item) => item.kind === kind);

  const fixedIncome = byKind("fixed_income");
  const fixedExpense = byKind("fixed_expense");
  const sales = byKind("sale");

  const currentMonth = monthKey(new Date());
  const overdueOf = (kind: FinanceKind): Overdue[] =>
    items
      .filter((item) => item.kind === kind)
      .map((item) => ({ item, months: overdueMonths(item, month, currentMonth) }))
      .filter(({ months }) => months.length > 0);
  const overdueIncome = overdueOf("fixed_income");
  const overdueExpense = overdueOf("fixed_expense");

  // What is overdue is added to this month's fixed totals.
  const fixedBalance =
    total(fixedIncome) +
    overdueTotal(overdueIncome) -
    total(fixedExpense) -
    overdueTotal(overdueExpense);
  const salesTotal = total(sales);
  const cash = fixedBalance + salesTotal;

  const add = async (
    kind: FinanceKind,
    name: string,
    amount: number,
    lastMonth: string | null
  ) =>
    !!(await addItem(
      kind,
      name,
      amount,
      month,
      lastMonth ? endMonthAfter(lastMonth) : null
    ));

  // Changes until which month a fixed account runs; empty means no end.
  const setLastMonth = (item: FinanceItem, lastMonth: string) => {
    // It has to cover at least its own first month.
    if (lastMonth && lastMonth < item.month.slice(0, 7)) return;
    endItem(item.id, lastMonth ? endMonthAfter(lastMonth) : null);
  };

  // A fixed account that started in an earlier month is only stopped from this
  // month on, so the months already closed keep their numbers.
  const startedEarlier = (item: FinanceItem) =>
    item.kind !== "sale" && item.month < month;

  const confirmDelete = async () => {
    const item = deleteTarget;
    setDeleteTarget(null);
    if (!item) return;
    const removed = startedEarlier(item)
      ? await endItem(item.id, month)
      : await deleteItem(item.id);
    if (removed) setToast({ id: Date.now(), text: "Removido" });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMonthDate((prev) => addMonths(prev, -1))}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-semibold capitalize">
          {format(monthDate, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMonthDate((prev) => addMonths(prev, 1))}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <>
              <div className="rounded-xl border border-foreground bg-foreground p-4 text-background">
                <p className="text-xs">Caixa do mês</p>
                <p className="text-2xl font-bold tabular-nums">
                  {currency.format(cash)}
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Vendas {currency.format(salesTotal)} · Fixo{" "}
                  {currency.format(fixedBalance)}
                </p>
              </div>

              <Section
                title="Contas fixas a receber"
                items={fixedIncome}
                overdue={overdueIncome}
                onSettleOverdue={(item, months) => setPaid(item.id, months, true)}
                namePlaceholder="Ex.: Mensalidade do cliente"
                fixedFrom={month}
                onAdd={(name, amount, lastMonth) =>
                  add("fixed_income", name, amount, lastMonth)
                }
                onSetLastMonth={setLastMonth}
                onTogglePaid={(item) =>
                  setPaid(item.id, [month], !item.paid_months?.includes(month))
                }
                onRemove={setDeleteTarget}
              />

              <Section
                title="Contas fixas a pagar"
                items={fixedExpense}
                overdue={overdueExpense}
                onSettleOverdue={(item, months) => setPaid(item.id, months, true)}
                namePlaceholder="Ex.: Aluguel"
                fixedFrom={month}
                onAdd={(name, amount, lastMonth) =>
                  add("fixed_expense", name, amount, lastMonth)
                }
                onSetLastMonth={setLastMonth}
                onTogglePaid={(item) =>
                  setPaid(item.id, [month], !item.paid_months?.includes(month))
                }
                onRemove={setDeleteTarget}
              />

              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="text-sm font-semibold">Diferença das fixas</p>
                  <p className="text-xs text-muted-foreground">
                    A receber menos a pagar
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums">
                  {currency.format(fixedBalance)}
                </p>
              </div>

              <Section
                title="Vendas"
                items={sales}
                namePlaceholder="Ex.: Site para cliente"
                onAdd={(name, amount) => add("sale", name, amount, null)}
                onRemove={setDeleteTarget}
              />
            </>
          )}
        </div>
      </ScrollArea>

      <ConfirmDelete
        label={
          deleteTarget
            ? startedEarlier(deleteTarget)
              ? `${deleteTarget.name} (deixa de valer a partir deste mês; os meses anteriores não mudam)`
              : deleteTarget.name
            : null
        }
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

// One list of the month (fixed to receive, fixed to pay or sales) with its
// total and a row to add a name and a value.
function Section({
  title,
  items,
  overdue = [],
  onSettleOverdue,
  namePlaceholder,
  fixedFrom,
  onAdd,
  onSetLastMonth,
  onTogglePaid,
  onRemove,
}: {
  title: string;
  items: FinanceItem[];
  // Fixed accounts carried over from earlier months that were not settled.
  overdue?: Overdue[];
  onSettleOverdue?: (item: FinanceItem, months: string[]) => void;
  namePlaceholder: string;
  // Given for the fixed-account lists: the month on screen ("yyyy-MM-01").
  // Enables choosing until which month an account runs.
  fixedFrom?: string;
  onAdd: (name: string, amount: number, lastMonth: string | null) => Promise<boolean>;
  onSetLastMonth?: (item: FinanceItem, lastMonth: string) => void;
  // Fixed accounts: marks the account as settled in the month on screen.
  onTogglePaid?: (item: FinanceItem) => void;
  onRemove: (item: FinanceItem) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  // Last month the new fixed account runs, "yyyy-MM"; empty = no end.
  const [lastMonth, setLastMonth] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // One late month of one account counts as one.
  const lateCount = overdue.reduce((sum, { months }) => sum + months.length, 0);

  const parsedAmount = parseAmount(amount);
  const amountInvalid = !!amount.trim() && parsedAmount === null;
  const canAdd = !!name.trim() && parsedAmount !== null && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd || parsedAmount === null) return;
    setSaving(true);
    setSaveError(false);
    const saved = await onAdd(name.trim(), parsedAmount, lastMonth || null);
    setSaving(false);
    if (saved) {
      setName("");
      setAmount("");
      setLastMonth("");
    } else {
      setSaveError(true);
    }
  };

  return (
    <section className="rounded-xl border">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="min-w-0 text-sm font-semibold">
          {title}
          {lateCount > 0 && (
            <span className="ml-2 text-xs font-medium text-destructive">
              {lateCount} {lateCount > 1 ? "atrasos" : "atraso"}
            </span>
          )}
        </h3>
        <span className="shrink-0 text-sm font-bold tabular-nums">
          {currency.format(total(items) + overdueTotal(overdue))}
        </span>
      </div>

      {(items.length > 0 || overdue.length > 0) && (
        <ul className="divide-y">
          {overdue.map(({ item, months }) => (
            <li
              key={"overdue-" + item.id}
              className="flex items-center gap-2 py-1.5 pr-4 pl-4"
            >
              <button
                type="button"
                onClick={() => onSettleOverdue?.(item, months)}
                aria-label={`Marcar os atrasos de ${item.name} como pagos`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-destructive/60"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{item.name}</span>
                <span className="block text-xs font-medium text-destructive">
                  Atrasado ·{" "}
                  {months.length > 1 ? months.length + " meses" : "1 mês"} (
                  {months
                    .map((m) => format(new Date(m + "T00:00"), "MMM", { locale: ptBR }))
                    .join(", ")}
                  )
                </span>
              </span>
              <span className="shrink-0 text-sm tabular-nums">
                {currency.format(Number(item.amount) * months.length)}
              </span>
            </li>
          ))}
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-1.5 pr-2 pl-4">
              {onTogglePaid && fixedFrom && (
                // Settled is only a green mark: the row keeps its normal look.
                <button
                  type="button"
                  onClick={() => onTogglePaid(item)}
                  aria-label={
                    item.paid_months?.includes(fixedFrom)
                      ? `Desmarcar ${item.name} como paga`
                      : `Marcar ${item.name} como paga`
                  }
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    item.paid_months?.includes(fixedFrom)
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-muted-foreground/50"
                  )}
                >
                  {item.paid_months?.includes(fixedFrom) && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{item.name}</span>
                {onSetLastMonth && (
                  // The month picker sits invisibly over the label.
                  <span className="relative inline-block text-xs text-muted-foreground underline underline-offset-2">
                    {item.end_month
                      ? "até " +
                        format(
                          new Date(lastMonthOf(item.end_month) + "-01T00:00"),
                          "MMM/yyyy",
                          { locale: ptBR }
                        )
                      : "sem data final"}
                    <input
                      type="month"
                      aria-label={`Até que mês vale ${item.name}`}
                      min={item.month.slice(0, 7)}
                      value={item.end_month ? lastMonthOf(item.end_month) : ""}
                      onChange={(e) => onSetLastMonth(item, e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm tabular-nums">
                {currency.format(Number(item.amount))}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemove(item)}
                aria-label={`Remover ${item.name}`}
                className="shrink-0 text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleSubmit}
        className={cn("space-y-2 p-3", items.length > 0 && "border-t")}
      >
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={namePlaceholder}
            aria-label="Nome"
            className="h-11 min-w-0 flex-1 text-base"
          />
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            aria-label="Valor em reais"
            className="h-11 w-24 shrink-0 text-base"
          />
          <Button
            type="submit"
            size="icon-lg"
            disabled={!canAdd}
            aria-label="Adicionar"
            className="h-11 w-11 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {fixedFrom && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="shrink-0">Até (opcional)</span>
            <Input
              type="month"
              min={fixedFrom.slice(0, 7)}
              value={lastMonth}
              onChange={(e) => setLastMonth(e.target.value)}
              className="block h-10 min-w-0 flex-1 appearance-none text-base"
            />
          </label>
        )}
        {amountInvalid && (
          <p className="text-sm text-destructive">Digite um valor maior que zero.</p>
        )}
        {saveError && (
          <p className="text-sm text-destructive">
            Não foi possível salvar. Tente de novo.
          </p>
        )}
      </form>
    </section>
  );
}
