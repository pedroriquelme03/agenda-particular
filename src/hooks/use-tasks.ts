"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Task } from "@/lib/types";

export type TaskInput = Pick<
  Task,
  "title" | "description" | "project" | "due_date" | "value"
>;

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching tasks:", error);
    } else {
      setTasks(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (task: TaskInput) => {
    const { data, error } = await supabase
      .from("tasks")
      .insert(task)
      .select()
      .single();
    if (error) {
      console.error("Error creating task:", error);
      return null;
    }
    setTasks((prev) => [data, ...prev]);
    return data as Task;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { data, error } = await supabase
      .from("tasks")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("Error updating task:", error);
      return null;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? (data as Task) : t)));
    return data as Task;
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error("Error deleting task:", error);
      return false;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    return true;
  };

  return { tasks, loading, createTask, updateTask, deleteTask };
}
