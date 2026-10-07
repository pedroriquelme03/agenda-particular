"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/lib/types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching categories:", error);
    } else {
      setCategories(data ?? []);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (name: string, color: string) => {
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, color })
      .select()
      .single();
    if (error) {
      console.error("Error creating category:", error);
      return null;
    }
    setCategories((prev) => [...prev, data]);
    return data as Category;
  };

  // Items that used the category keep existing; the database clears their link.
  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      console.error("Error deleting category:", error);
      return false;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  return { categories, createCategory, deleteCategory };
}

export type CategoriesState = ReturnType<typeof useCategories>;
