do $$ begin
  create type public.banner_type as enum ('character', 'weapon', 'standard', 'event');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.guardrail_rule_kind as enum ('warning', 'hard_stop', 'cooldown', 'daily_cap');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  banner_type public.banner_type not null default 'character',
  featured text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  soft_pity integer check (soft_pity is null or soft_pity >= 0),
  hard_pity integer not null check (hard_pity > 0),
  base_rate numeric(8, 6) not null default 0.006 check (base_rate > 0 and base_rate <= 1),
  rate_up numeric(8, 6) not null default 0.5 check (rate_up >= 0 and rate_up <= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, name, ends_at)
);

create table if not exists public.user_banners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_game_id uuid not null references public.user_games(id) on delete cascade,
  banner_id uuid not null references public.banners(id) on delete cascade,
  current_pity integer not null default 0 check (current_pity >= 0),
  pulls_total integer not null default 0 check (pulls_total >= 0),
  pulls_5_star integer not null default 0 check (pulls_5_star >= 0),
  is_tracking boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, banner_id)
);

create table if not exists public.pull_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_banner_id uuid not null references public.user_banners(id) on delete cascade,
  pulls_count integer not null check (pulls_count > 0),
  total_cost integer not null default 0 check (total_cost >= 0),
  currency text not null default 'KRW',
  memo text,
  pulled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.pulls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pull_session_id uuid not null references public.pull_sessions(id) on delete cascade,
  user_banner_id uuid not null references public.user_banners(id) on delete cascade,
  pull_number integer not null check (pull_number > 0),
  pity_before integer not null check (pity_before >= 0),
  rarity integer not null check (rarity between 3 and 5),
  item_name text,
  cost integer not null default 0 check (cost >= 0),
  is_rate_up boolean,
  pulled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (pull_session_id, pull_number)
);

create table if not exists public.guardrail_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.guardrail_rule_kind not null,
  name text not null,
  threshold_amount integer check (threshold_amount is null or threshold_amount >= 0),
  threshold_percent integer check (threshold_percent is null or threshold_percent between 1 and 200),
  cooldown_days integer check (cooldown_days is null or cooldown_days between 1 and 30),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_banners_game_active on public.banners(game_id, is_active, ends_at);
create index if not exists idx_user_banners_user on public.user_banners(user_id, is_tracking);
create index if not exists idx_user_banners_banner on public.user_banners(banner_id);
create index if not exists idx_pull_sessions_user_pulled_at on public.pull_sessions(user_id, pulled_at desc);
create index if not exists idx_pulls_user_pulled_at on public.pulls(user_id, pulled_at desc);
create index if not exists idx_pulls_user_banner on public.pulls(user_banner_id, pulled_at desc);
create index if not exists idx_guardrail_rules_user on public.guardrail_rules(user_id, enabled);

drop trigger if exists set_banners_updated_at on public.banners;
create trigger set_banners_updated_at before update on public.banners
for each row execute function private.set_updated_at();

drop trigger if exists set_user_banners_updated_at on public.user_banners;
create trigger set_user_banners_updated_at before update on public.user_banners
for each row execute function private.set_updated_at();

drop trigger if exists set_guardrail_rules_updated_at on public.guardrail_rules;
create trigger set_guardrail_rules_updated_at before update on public.guardrail_rules
for each row execute function private.set_updated_at();

alter table public.banners enable row level security;
alter table public.user_banners enable row level security;
alter table public.pull_sessions enable row level security;
alter table public.pulls enable row level security;
alter table public.guardrail_rules enable row level security;

grant select on public.banners to anon, authenticated;
grant all on public.user_banners to authenticated;
grant all on public.pull_sessions to authenticated;
grant all on public.pulls to authenticated;
grant all on public.guardrail_rules to authenticated;

drop policy if exists "Banners are readable by everyone" on public.banners;
create policy "Banners are readable by everyone"
on public.banners for select
to anon, authenticated
using (true);

drop policy if exists "User banners are owned" on public.user_banners;
create policy "User banners are owned"
on public.user_banners for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_games ug
    join public.banners b on b.id = user_banners.banner_id
    where ug.id = user_banners.user_game_id
      and ug.user_id = (select auth.uid())
      and ug.game_id = b.game_id
  )
);

drop policy if exists "Pull sessions are owned" on public.pull_sessions;
create policy "Pull sessions are owned"
on public.pull_sessions for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_banners ub
    where ub.id = pull_sessions.user_banner_id
      and ub.user_id = (select auth.uid())
  )
);

drop policy if exists "Pulls are owned" on public.pulls;
create policy "Pulls are owned"
on public.pulls for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.pull_sessions ps
    join public.user_banners ub on ub.id = ps.user_banner_id
    where ps.id = pulls.pull_session_id
      and ub.id = pulls.user_banner_id
      and ps.user_id = (select auth.uid())
      and ub.user_id = (select auth.uid())
  )
);

drop policy if exists "Guardrail rules are owned" on public.guardrail_rules;
create policy "Guardrail rules are owned"
on public.guardrail_rules for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
