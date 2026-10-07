"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { FinanceItem, FinanceKind } from "@/lib/types";

export function useFinance() {
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("finance_items")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching finance items:", error);
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Months are the first day of the month, "yyyy-MM-01". `endMonth` is the
  // first month a fixed account no longer applies to; null means no end.
  const addItem = async (
    kind: FinanceKind,
    name: string,
    amount: number,
    month: string,
    endMonth: string | null = null
  ) => {
    const { data, error } = await supabase
      .from("finance_items")
      .insert({ kind, name, amount, month, end_month: endMonth })
      .select()
      .single();
    if (error) {
      console.error("Error adding finance item:", error);
      return null;
    }
    setItems((prev) => [...prev, data]);
    return data as FinanceItem;
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("finance_items").delete().eq("id", id);
    if (error) {
      console.error("Error deleting finance item:", error);
      return false;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    return true;
  };

  // Sets the first month a fixed account no longer applies to, keeping it in
  // the earlier months. Null makes it run with no end again.
  const endItem = async (id: string, month: string | null) => {
    const { error } = await supabase
      .from("finance_items")
      .update({ end_month: month })
      .eq("id", id);
    if (error) {
      console.error("Error ending finance item:", error);
      return false;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, end_month: month } : item))
    );
    return true;
  };

  return { items, loading, addItem, deleteItem, endItem };
}
