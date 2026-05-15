insert into public.games (slug, name, developer, genre, soft_pity, hard_pity, base_cost, has_guarantee)
values
  ('blue-archive', '블루아카이브', 'Nexon Games', '수집형 RPG', 150, 200, 1200, true),
  ('genshin-impact', '원신', 'HoYoverse', '오픈월드 RPG', 75, 90, 3300, true),
  ('wuthering-waves', '명조: 워더링 웨이브', 'Kuro Games', '오픈월드 액션 RPG', 65, 80, 3300, true),
  ('honkai-star-rail', '붕괴: 스타레일', 'HoYoverse', '턴제 RPG', 75, 90, 3300, true),
  ('nikke', '승리의 여신: 니케', 'Shift Up', '슈팅 RPG', 60, 200, 3000, false),
  ('arknights', '명일방주', 'Hypergryph', '전략 타워디펜스', 50, 99, 1200, false),
  ('fate-grand-order', 'Fate/Grand Order', 'Lasengle', '수집형 RPG', null, 330, 1100, true),
  ('project-sekai', '프로젝트 세카이', 'Colorful Palette', '리듬 게임', 200, 300, 1200, true),
  ('uma-musume', '우마무스메 프리티 더비', 'Cygames', '육성 시뮬레이션', 150, 200, 1200, true),
  ('zenless-zone-zero', '젠레스 존 제로', 'HoYoverse', '액션 RPG', 75, 90, 3300, true)
on conflict (slug) do update
set name = excluded.name,
    developer = excluded.developer,
    genre = excluded.genre,
    soft_pity = excluded.soft_pity,
    hard_pity = excluded.hard_pity,
    base_cost = excluded.base_cost,
    has_guarantee = excluded.has_guarantee;

insert into public.banners (
  game_id,
  name,
  banner_type,
  featured,
  starts_at,
  ends_at,
  soft_pity,
  hard_pity,
  base_rate,
  rate_up,
  is_active
)
select
  games.id,
  seed.name,
  seed.banner_type::public.banner_type,
  seed.featured,
  seed.starts_at::timestamptz,
  seed.ends_at::timestamptz,
  seed.soft_pity,
  seed.hard_pity,
  seed.base_rate,
  seed.rate_up,
  true
from (
  values
    ('genshin-impact', '푸른 서약', 'character', '푸리나', '2026-05-01T00:00:00+09', '2026-05-28T23:59:59+09', 75, 90, 0.006, 0.5),
    ('genshin-impact', '무기 기원: 고요한 파도', 'weapon', '물빛의 의장', '2026-05-01T00:00:00+09', '2026-05-28T23:59:59+09', 63, 80, 0.007, 0.75),
    ('blue-archive', '방과 후의 약속', 'character', '호시노', '2026-05-09T00:00:00+09', '2026-05-30T23:59:59+09', 150, 200, 0.007, 0.5),
    ('wuthering-waves', '바람이 머무는 해안', 'character', '카르테시아', '2026-05-08T00:00:00+09', '2026-05-22T23:59:59+09', 65, 80, 0.008, 0.5)
) as seed(slug, name, banner_type, featured, starts_at, ends_at, soft_pity, hard_pity, base_rate, rate_up)
join public.games on games.slug = seed.slug
on conflict (game_id, name, ends_at) do update
set banner_type = excluded.banner_type,
    featured = excluded.featured,
    starts_at = excluded.starts_at,
    soft_pity = excluded.soft_pity,
    hard_pity = excluded.hard_pity,
    base_rate = excluded.base_rate,
    rate_up = excluded.rate_up,
    is_active = excluded.is_active,
    updated_at = now();
