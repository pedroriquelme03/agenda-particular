"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { ChecklistItem, Idea, IdeaUpdate } from "@/lib/types";

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIdeas = useCallback(async () => {
    const { data, error } = await supabase
      .from("ideas")
      .select("*, idea_updates(*)")
      .order("created_at", { ascending: false })
      .order("created_at", { referencedTable: "idea_updates", ascending: false });
    if (error) {
      console.error("Error fetching ideas:", error);
    } else {
      setIdeas((data ?? []) as Idea[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const createIdea = async (
    title: string,
    description: string,
    steps: ChecklistItem[]
  ) => {
    const { data, error } = await supabase
      .from("ideas")
      .insert({ title, description, steps })
      .select()
      .single();
    if (error) {
      console.error("Error creating idea:", error);
      return null;
    }
    const idea = { ...data, idea_updates: [] } as Idea;
    setIdeas((prev) => [idea, ...prev]);
    return idea;
  };

  const updateIdea = async (
    id: string,
    updates: Partial<
      Pick<Idea, "title" | "description" | "progress" | "steps" | "archived_at">
    >
  ) => {
    const { error } = await supabase
      .from("ideas")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("Error updating idea:", error);
      return false;
    }
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === id ? { ...idea, ...updates } : idea))
    );
    return true;
  };

  const deleteIdea = async (id: string) => {
    const { error } = await supabase.from("ideas").delete().eq("id", id);
    if (error) {
      console.error("Error deleting idea:", error);
      return false;
    }
    setIdeas((prev) => prev.filter((idea) => idea.id !== id));
    return true;
  };

  // Records one step of progress on an idea.
  const addUpdate = async (ideaId: string, text: string) => {
    const { data, error } = await supabase
      .from("idea_updates")
      .insert({ idea_id: ideaId, text })
      .select()
      .single();
    if (error) {
      console.error("Error adding idea update:", error);
      return false;
    }
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId
          ? { ...idea, idea_updates: [data as IdeaUpdate, ...idea.idea_updates] }
          : idea
      )
    );
    return true;
  };

  const deleteUpdate = async (ideaId: string, updateId: string) => {
    const { error } = await supabase
      .from("idea_updates")
      .delete()
      .eq("id", updateId);
    if (error) {
      console.error("Error deleting idea update:", error);
      return false;
    }
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId
          ? {
              ...idea,
              idea_updates: idea.idea_updates.filter((u) => u.id !== updateId),
            }
          : idea
      )
    );
    return true;
  };

  return {
    ideas,
    loading,
    createIdea,
    updateIdea,
    deleteIdea,
    addUpdate,
    deleteUpdate,
  };
}
