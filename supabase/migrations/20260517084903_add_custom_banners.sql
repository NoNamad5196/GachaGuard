alter table public.banners
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists is_public boolean not null default true,
  add column if not exists source text not null default 'manual',
  add column if not exists source_url text;

alter table public.banners
  drop constraint if exists banners_source_not_blank,
  add constraint banners_source_not_blank check (length(trim(source)) > 0);

alter table public.banners
  drop constraint if exists banners_public_owner_consistency,
  add constraint banners_public_owner_consistency check (
    (is_public and created_by is null) or
    (not is_public and created_by is not null)
  );

alter table public.banners
  drop constraint if exists banners_game_id_name_ends_at_key;

create unique index if not exists idx_banners_public_identity
  on public.banners(game_id, name, ends_at)
  where is_public;

create unique index if not exists idx_banners_private_identity
  on public.banners(created_by, game_id, name, ends_at)
  where not is_public;

create index if not exists idx_banners_created_by_active
  on public.banners(created_by, is_active, ends_at)
  where created_by is not null;

grant insert, update, delete on public.banners to authenticated;

drop policy if exists "Banners are readable by everyone" on public.banners;
create policy "Banners are readable by everyone"
on public.banners for select
to anon, authenticated
using (
  is_public
  or ((select auth.uid()) is not null and created_by = (select auth.uid()))
);

drop policy if exists "Users can create private banners" on public.banners;
create policy "Users can create private banners"
on public.banners for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and created_by = (select auth.uid())
  and is_public = false
);

drop policy if exists "Users can update private banners" on public.banners;
create policy "Users can update private banners"
on public.banners for update
to authenticated
using (
  (select auth.uid()) is not null
  and created_by = (select auth.uid())
  and is_public = false
)
with check (
  (select auth.uid()) is not null
  and created_by = (select auth.uid())
  and is_public = false
);

drop policy if exists "Users can delete private banners" on public.banners;
create policy "Users can delete private banners"
on public.banners for delete
to authenticated
using (
  (select auth.uid()) is not null
  and created_by = (select auth.uid())
  and is_public = false
);
