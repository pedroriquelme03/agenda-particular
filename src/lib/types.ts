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
  // Saved links (other entries of type "link") attached to this note.
  linked_ids?: string[];
  // Set when the item is archived: kept, but out of the lists and the calendar.
  archived_at?: string | null;
  // The account's own category, if one was chosen (appointments).
  category_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface IdeaUpdate {
  id: string;
  idea_id: string;
  text: string;
  created_at: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  // 0 to 100: the share of steps done.
  progress: number;
  // What has to be done to get there, ticked off one by one.
  steps?: ChecklistItem[];
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  // Log of progress, newest first.
  idea_updates: IdeaUpdate[];
}

export type MeetingMode = "online" | "in_person";

export interface Meeting {
  id: string;
  title: string;
  // Plain date, "yyyy-MM-dd", and optional time, "HH:mm:ss".
  meeting_date: string;
  meeting_time: string | null;
  mode: MeetingMode;
  // Written during the meeting.
  notes: string;
  // Written from the notes by the assistant.
  summary: string;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ContentPlatform = "tiktok" | "youtube" | "instagram" | "trafego";

// A reference video to record a version of.
export interface ContentItem {
  id: string;
  url: string;
  title: string | null;
  platform: ContentPlatform;
  // Set when the video was recorded.
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type HouseKind = "market" | "chore" | "service";

export interface ServiceQuote {
  id: string;
  // "Orçamento 1", or the name of who gave it.
  label: string;
  amount: number;
  chosen: boolean;
}

// One line of the "Casa" module: something to buy, a chore, or a service.
export interface HouseItem {
  id: string;
  kind: HouseKind;
  text: string;
  done: boolean;
  // Services only: the quotes gathered for it.
  quotes: ServiceQuote[];
  archived_at?: string | null;
  created_at: string;
}

export type FinanceKind = "fixed_income" | "fixed_expense" | "sale";

export interface FinanceItem {
  id: string;
  kind: FinanceKind;
  name: string;
  amount: number;
  // First day of a month, "yyyy-MM-01". Fixed account: first month it applies
  // to. Sale: the month it belongs to.
  month: string;
  // Fixed account only: first month it no longer applies to.
  end_month: string | null;
  // Fixed account only: the months ("yyyy-MM-01") in which it was settled.
  paid_months?: string[];
  created_at: string;
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
  // Steps of the task, ticked off one by one.
  checklist?: ChecklistItem[];
  archived_at?: string | null;
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
