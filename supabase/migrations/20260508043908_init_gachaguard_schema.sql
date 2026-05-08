create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

do $$ begin
  create type public.payment_type as enum ('gacha', 'pass', 'coin', 'event', 'other');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  timezone text not null default 'Asia/Seoul',
  session_warning_amount integer not null default 50000 check (session_warning_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  developer text,
  genre text,
  soft_pity integer check (soft_pity is null or soft_pity >= 0),
  hard_pity integer check (hard_pity is null or hard_pity > 0),
  base_cost integer not null default 0 check (base_cost >= 0),
  has_guarantee boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  nickname text,
  current_pity integer not null default 0 check (current_pity >= 0),
  monthly_budget integer not null default 0 check (monthly_budget >= 0),
  warning_threshold_percent integer not null default 70 check (warning_threshold_percent between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year_month text not null check (year_month ~ '^[0-9]{4}-[0-9]{2}$'),
  total_budget integer not null default 0 check (total_budget >= 0),
  warning_at integer not null default 70 check (warning_at between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year_month)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_game_id uuid not null references public.user_games(id) on delete cascade,
  amount integer not null check (amount > 0),
  type public.payment_type not null,
  paid_at timestamptz not null default now(),
  memo text,
  regret_score integer check (regret_score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gacha_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_game_id uuid not null references public.user_games(id) on delete cascade,
  pulls integer not null check (pulls > 0),
  result text,
  pity_at_pull integer not null check (pity_at_pull >= 0),
  pulled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_game_id uuid not null references public.user_games(id) on delete cascade,
  name text not null,
  amount integer not null check (amount > 0),
  type public.payment_type not null default 'pass',
  day_of_month integer not null default 1 check (day_of_month between 1 and 28),
  is_active boolean not null default true,
  last_applied_year_month text check (last_applied_year_month is null or last_applied_year_month ~ '^[0-9]{4}-[0-9]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_games_user_id on public.user_games(user_id);
create index if not exists idx_budgets_user_month on public.budgets(user_id, year_month);
create index if not exists idx_payments_user_paid_at on public.payments(user_id, paid_at desc);
create index if not exists idx_payments_user_game on public.payments(user_game_id, paid_at desc);
create index if not exists idx_gacha_logs_user_game on public.gacha_logs(user_game_id, pulled_at desc);
create index if not exists idx_payment_templates_user on public.payment_templates(user_id, is_active);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists set_user_games_updated_at on public.user_games;
create trigger set_user_games_updated_at before update on public.user_games
for each row execute function private.set_updated_at();

drop trigger if exists set_budgets_updated_at on public.budgets;
create trigger set_budgets_updated_at before update on public.budgets
for each row execute function private.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments
for each row execute function private.set_updated_at();

drop trigger if exists set_payment_templates_updated_at on public.payment_templates;
create trigger set_payment_templates_updated_at before update on public.payment_templates
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.user_games enable row level security;
alter table public.budgets enable row level security;
alter table public.payments enable row level security;
alter table public.gacha_logs enable row level security;
alter table public.payment_templates enable row level security;

drop policy if exists "Games are readable by everyone" on public.games;
create policy "Games are readable by everyone"
on public.games for select
to anon, authenticated
using (true);

drop policy if exists "Profiles are self readable" on public.profiles;
create policy "Profiles are self readable"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Profiles are self updatable" on public.profiles;
create policy "Profiles are self updatable"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "User games are owned" on public.user_games;
create policy "User games are owned"
on public.user_games for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Budgets are owned" on public.budgets;
create policy "Budgets are owned"
on public.budgets for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Payments are owned" on public.payments;
create policy "Payments are owned"
on public.payments for all
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.user_games ug
    where ug.id = payments.user_game_id
      and ug.user_id = auth.uid()
  )
);

drop policy if exists "Gacha logs are owned" on public.gacha_logs;
create policy "Gacha logs are owned"
on public.gacha_logs for all
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.user_games ug
    where ug.id = gacha_logs.user_game_id
      and ug.user_id = auth.uid()
  )
);

drop policy if exists "Payment templates are owned" on public.payment_templates;
create policy "Payment templates are owned"
on public.payment_templates for all
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.user_games ug
    where ug.id = payment_templates.user_game_id
      and ug.user_id = auth.uid()
  )
);
