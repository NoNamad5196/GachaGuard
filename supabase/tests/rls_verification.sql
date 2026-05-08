-- Run after applying migrations in a Supabase SQL editor or local test DB.
-- This smoke test verifies the intended ownership boundary by simulating
-- authenticated JWT claims with PostgREST's request.jwt.claim.sub setting.

begin;

select plan(6);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'a@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.com')
on conflict (id) do nothing;

insert into public.games (id, slug, name, base_cost, hard_pity)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rls-test-game', 'RLS Test Game', 1000, 80)
on conflict (slug) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

insert into public.user_games (id, user_id, game_id)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

insert into public.payments (user_id, user_game_id, amount, type)
values (
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  11000,
  'gacha'
);

select is((select count(*)::int from public.user_games), 1, 'owner can read own user_games');
select is((select count(*)::int from public.payments), 1, 'owner can read own payments');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

select is((select count(*)::int from public.user_games), 0, 'other user cannot read user_games');
select is((select count(*)::int from public.payments), 0, 'other user cannot read payments');
select throws_ok(
  $$insert into public.payments (user_id, user_game_id, amount, type)
    values ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 11000, 'gacha')$$,
  '42501',
  null,
  'other user cannot write into another user_game'
);
select is((select count(*)::int from public.games), 1, 'games remain publicly readable');

select * from finish();

rollback;
