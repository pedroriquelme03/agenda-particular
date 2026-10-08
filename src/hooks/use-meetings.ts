"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Meeting } from "@/lib/types";

export type MeetingInput = Pick<
  Meeting,
  "title" | "meeting_date" | "meeting_time" | "mode"
>;

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = useCallback(async () => {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching meetings:", error);
    } else {
      setMeetings(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const createMeeting = async (meeting: MeetingInput) => {
    const { data, error } = await supabase
      .from("meetings")
      .insert(meeting)
      .select()
      .single();
    if (error) {
      console.error("Error creating meeting:", error);
      return null;
    }
    setMeetings((prev) => [data, ...prev]);
    return data as Meeting;
  };

  const updateMeeting = async (id: string, updates: Partial<Meeting>) => {
    const { data, error } = await supabase
      .from("meetings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("Error updating meeting:", error);
      return null;
    }
    setMeetings((prev) => prev.map((m) => (m.id === id ? (data as Meeting) : m)));
    return data as Meeting;
  };

  const deleteMeeting = async (id: string) => {
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) {
      console.error("Error deleting meeting:", error);
      return false;
    }
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    return true;
  };

  return { meetings, loading, createMeeting, updateMeeting, deleteMeeting };
}

export type MeetingsState = ReturnType<typeof useMeetings>;
