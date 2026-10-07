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
  // Set when an appointment is checked off as done.
  completed_at?: string | null;
  tags: string[];
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
