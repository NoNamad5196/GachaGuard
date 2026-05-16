-- Run after applying migrations in a Supabase SQL editor or local test DB.
-- This smoke test verifies the intended ownership boundary by simulating
-- authenticated JWT claims with PostgREST's request.jwt.claim.sub setting.

begin;

select plan(18);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'a@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.com')
on conflict (id) do nothing;

insert into public.games (id, slug, name, base_cost, hard_pity)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rls-test-game', 'RLS Test Game', 1000, 80)
on conflict (slug) do nothing;

insert into public.banners (
  id,
  game_id,
  name,
  banner_type,
  featured,
  starts_at,
  ends_at,
  soft_pity,
  hard_pity,
  base_rate,
  rate_up
)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'RLS Test Banner',
  'character',
  'Test Featured',
  now(),
  now() + interval '14 days',
  65,
  80,
  0.008,
  0.5
)
on conflict (game_id, name, ends_at) do nothing;

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

insert into public.payments (
  user_id,
  user_game_id,
  amount,
  type,
  source,
  import_fingerprint,
  external_order_id,
  raw_description
)
values (
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  33000,
  'coin',
  'google_play',
  'rls-import-owner',
  'GPA.1111-2222',
  'Google Play RLS import'
);

insert into public.user_banners (
  id,
  user_id,
  user_game_id,
  banner_id,
  current_pity,
  pulls_total
)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  12,
  12
);

insert into public.pull_sessions (
  id,
  user_id,
  user_banner_id,
  pulls_count,
  total_cost
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '11111111-1111-4111-8111-111111111111',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  1,
  1000
);

insert into public.pulls (
  user_id,
  pull_session_id,
  user_banner_id,
  pull_number,
  pity_before,
  rarity,
  cost
)
values (
  '11111111-1111-4111-8111-111111111111',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  1,
  12,
  4,
  1000
);

insert into public.guardrail_rules (
  user_id,
  kind,
  name,
  threshold_percent
)
values (
  '11111111-1111-4111-8111-111111111111',
  'warning',
  'RLS warning',
  80
);

select is((select count(*)::int from public.user_games), 1, 'owner can read own user_games');
select is((select count(*)::int from public.payments), 2, 'owner can read own payments');
select is((select count(*)::int from public.user_banners), 1, 'owner can read own user_banners');
select is((select count(*)::int from public.pull_sessions), 1, 'owner can read own pull_sessions');
select is((select count(*)::int from public.pulls), 1, 'owner can read own pulls');
select is((select count(*)::int from public.guardrail_rules), 1, 'owner can read own guardrail_rules');
select throws_ok(
  $$insert into public.payments (user_id, user_game_id, amount, type, source, import_fingerprint)
    values ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 33000, 'coin', 'google_play', 'rls-import-owner')$$,
  '23505',
  null,
  'duplicate import fingerprint is blocked per user'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

select is((select count(*)::int from public.user_games), 0, 'other user cannot read user_games');
select is((select count(*)::int from public.payments), 0, 'other user cannot read payments');
select is((select count(*)::int from public.user_banners), 0, 'other user cannot read user_banners');
select is((select count(*)::int from public.pull_sessions), 0, 'other user cannot read pull_sessions');
select is((select count(*)::int from public.pulls), 0, 'other user cannot read pulls');
select is((select count(*)::int from public.guardrail_rules), 0, 'other user cannot read guardrail_rules');
select throws_ok(
  $$insert into public.payments (user_id, user_game_id, amount, type)
    values ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 11000, 'gacha')$$,
  '42501',
  null,
  'other user cannot write into another user_game'
);
select throws_ok(
  $$insert into public.payments (user_id, user_game_id, amount, type, source, import_fingerprint)
    values ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 33000, 'coin', 'google_play', 'rls-import-other')$$,
  '42501',
  null,
  'other user cannot write imported payment into another user_game'
);
select throws_ok(
  $$insert into public.user_banners (user_id, user_game_id, banner_id)
    values ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')$$,
  '42501',
  null,
  'other user cannot track another user_game banner'
);
select is((select count(*)::int from public.games), 1, 'games remain publicly readable');
select is((select count(*)::int from public.banners), 1, 'banners remain publicly readable');

select * from finish();

rollback;
