create index if not exists idx_user_games_game_id on public.user_games(game_id);
create index if not exists idx_gacha_logs_user_id on public.gacha_logs(user_id);
create index if not exists idx_payment_templates_user_game_id on public.payment_templates(user_game_id);

drop policy if exists "Profiles are self readable" on public.profiles;
create policy "Profiles are self readable"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Profiles are self updatable" on public.profiles;
create policy "Profiles are self updatable"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "User games are owned" on public.user_games;
create policy "User games are owned"
on public.user_games for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Budgets are owned" on public.budgets;
create policy "Budgets are owned"
on public.budgets for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Payments are owned" on public.payments;
create policy "Payments are owned"
on public.payments for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_games ug
    where ug.id = payments.user_game_id
      and ug.user_id = (select auth.uid())
  )
);

drop policy if exists "Gacha logs are owned" on public.gacha_logs;
create policy "Gacha logs are owned"
on public.gacha_logs for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_games ug
    where ug.id = gacha_logs.user_game_id
      and ug.user_id = (select auth.uid())
  )
);

drop policy if exists "Payment templates are owned" on public.payment_templates;
create policy "Payment templates are owned"
on public.payment_templates for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_games ug
    where ug.id = payment_templates.user_game_id
      and ug.user_id = (select auth.uid())
  )
);
