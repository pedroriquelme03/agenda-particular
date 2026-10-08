"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { ContentItem } from "@/lib/types";

export type ContentInput = Pick<ContentItem, "url" | "title" | "platform">;

export function useContent() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("content_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching content items:", error);
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (item: ContentInput) => {
    const { data, error } = await supabase
      .from("content_items")
      .insert(item)
      .select()
      .single();
    if (error) {
      console.error("Error creating content item:", error);
      return null;
    }
    setItems((prev) => [data, ...prev]);
    return data as ContentItem;
  };

  const updateItem = async (id: string, updates: Partial<ContentItem>) => {
    const { data, error } = await supabase
      .from("content_items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("Error updating content item:", error);
      return null;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? (data as ContentItem) : item))
    );
    return data as ContentItem;
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("content_items").delete().eq("id", id);
    if (error) {
      console.error("Error deleting content item:", error);
      return false;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    return true;
  };

  return { items, loading, createItem, updateItem, deleteItem };
}
