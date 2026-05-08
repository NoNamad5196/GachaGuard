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
