"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { HouseItem, HouseKind } from "@/lib/types";

export function useHouse() {
  const [items, setItems] = useState<HouseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("house_items")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching house items:", error);
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (kind: HouseKind, text: string) => {
    const { data, error } = await supabase
      .from("house_items")
      .insert({ kind, text })
      .select()
      .single();
    if (error) {
      console.error("Error adding house item:", error);
      return null;
    }
    setItems((prev) => [...prev, data]);
    return data as HouseItem;
  };

  // Applied on screen right away; a failed save puts the old value back.
  const updateItem = async (
    id: string,
    updates: Partial<Pick<HouseItem, "text" | "done" | "quotes" | "archived_at">>
  ) => {
    const before = items.find((item) => item.id === id);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    const { error } = await supabase
      .from("house_items")
      .update(updates)
      .eq("id", id);
    if (error) {
      console.error("Error updating house item:", error);
      if (before) {
        setItems((prev) => prev.map((item) => (item.id === id ? before : item)));
      }
      return false;
    }
    return true;
  };

  const deleteItems = async (ids: string[]) => {
    if (ids.length === 0) return true;
    const { error } = await supabase.from("house_items").delete().in("id", ids);
    if (error) {
      console.error("Error deleting house items:", error);
      return false;
    }
    setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
    return true;
  };

  return { items, loading, addItem, updateItem, deleteItems };
}
