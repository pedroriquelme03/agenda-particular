export type EntryType = "text" | "voice" | "image" | "link";

export interface Entry {
  id: string;
  type: EntryType;
  title: string | null;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  link_url: string | null;
  trello_card_id: string | null;
  is_reminder: boolean;
  reminder_date: string | null;
  // Optional end of an appointment; null when only the start is known.
  reminder_end_date?: string | null;
  // Set when an appointment is checked off as done.
  completed_at?: string | null;
  tags: string[];
  // The account's own category, if one was chosen (appointments).
  category_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  // One of the values in CATEGORY_COLORS.
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  project: string | null;
  // Plain date, "yyyy-MM-dd".
  due_date: string | null;
  // Optional time of day for the deadline, "HH:mm:ss".
  due_time?: string | null;
  value: number | null;
  category_id?: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrelloBoard {
  id: string;
  name: string;
}

export interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  url: string;
}
