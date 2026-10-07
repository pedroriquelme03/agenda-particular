"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Entry, EntryType } from "@/lib/types";

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EntryType | "all">("all");
  const [search, setSearch] = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("type", filter);
    }

    if (search.trim()) {
      query = query.or(
        `title.ilike.%${search}%,content.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching entries:", error);
    } else {
      setEntries(data ?? []);
    }
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const createEntry = async (
    entry: Omit<Entry, "id" | "created_at" | "updated_at">
  ) => {
    const { data, error } = await supabase
      .from("entries")
      .insert(entry)
      .select()
      .single();
    if (error) {
      console.error("Error creating entry:", error);
      return null;
    }
    setEntries((prev) => [data, ...prev]);
    return data as Entry;
  };

  const updateEntry = async (id: string, updates: Partial<Entry>) => {
    const { data, error } = await supabase
      .from("entries")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("Error updating entry:", error);
      return null;
    }
    setEntries((prev) => prev.map((e) => (e.id === id ? (data as Entry) : e)));
    return data as Entry;
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) {
      console.error("Error deleting entry:", error);
      return false;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    return true;
  };

  return {
    entries,
    loading,
    filter,
    setFilter,
    search,
    setSearch,
    createEntry,
    updateEntry,
    deleteEntry,
    refetch: fetchEntries,
  };
}
