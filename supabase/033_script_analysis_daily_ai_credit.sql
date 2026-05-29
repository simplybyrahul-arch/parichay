-- Track whether a script analysis consumed an external AI provider credit.
-- Existing rows default to no credit consumed so old history does not block users.

alter table public.script_analyses
  add column if not exists analysis_source text not null default 'ai',
  add column if not exists provider_name text,
  add column if not exists used_ai_credit boolean not null default false;

create index if not exists script_analyses_daily_ai_credit_idx
  on public.script_analyses(user_id, created_at)
  where used_ai_credit = true;
