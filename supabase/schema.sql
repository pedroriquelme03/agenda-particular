create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('text', 'voice', 'image', 'link')),
  title text,
  content text not null default '',
  image_url text,
  audio_url text,
  link_url text,
  trello_card_id text,
  is_reminder boolean not null default false,
  reminder_date timestamptz,
  tags text[] not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_entries_created_at on entries (created_at desc);
create index if not exists idx_entries_type on entries (type);
create index if not exists idx_entries_reminder on entries (reminder_date) where is_reminder = true;

-- Storage buckets (run these via Supabase dashboard or CLI)
-- insert into storage.buckets (id, name, public) values ('images', 'images', true);
-- insert into storage.buckets (id, name, public) values ('audio', 'audio', true);
