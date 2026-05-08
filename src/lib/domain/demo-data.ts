import { getMonthRange } from "@/lib/domain/calculations";
import type { DashboardData, GameMaster, UserGame } from "@/lib/domain/dashboard";

const demoGames: GameMaster[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "blue-archive",
    name: "블루아카이브",
    developer: "Nexon Games",
    genre: "수집형 RPG",
    soft_pity: 150,
    hard_pity: 200,
    base_cost: 1200,
    has_guarantee: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    slug: "genshin-impact",
    name: "원신",
    developer: "HoYoverse",
    genre: "오픈월드 RPG",
    soft_pity: 75,
    hard_pity: 90,
    base_cost: 3300,
    has_guarantee: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    slug: "wuthering-waves",
    name: "명조: 워더링 웨이브",
    developer: "Kuro Games",
    genre: "오픈월드 액션 RPG",
    soft_pity: 65,
    hard_pity: 80,
    base_cost: 3300,
    has_guarantee: true,
  },
];

const userGames: UserGame[] = demoGames.map((game, index) => ({
  id: `10000000-0000-4000-8000-00000000000${index + 1}`,
  user_id: "demo-user",
  game_id: game.id,
  nickname: null,
  current_pity: [67, 42, 18][index] ?? 0,
  monthly_budget: [80000, 120000, 60000][index] ?? 0,
  warning_threshold_percent: 70,
  is_active: true,
  games: game,
}));

export function getDemoDashboardData(): DashboardData {
  const range = getMonthRange();

  return {
    isDemo: true,
    yearMonth: range.yearMonth,
    profile: {
      id: "demo-user",
      email: "demo@gachaguard.local",
      display_name: "Demo Guard",
      timezone: "Asia/Seoul",
      session_warning_amount: 50000,
    },
    budget: {
      id: "20000000-0000-4000-8000-000000000001",
      year_month: range.yearMonth,
      total_budget: 220000,
      warning_at: 70,
    },
    games: demoGames,
    userGames,
    payments: [
      {
        id: "30000000-0000-4000-8000-000000000001",
        user_id: "demo-user",
        user_game_id: userGames[0].id,
        amount: 33000,
        type: "gacha",
        paid_at: new Date(range.start.getTime() + 2 * 86400000).toISOString(),
        memo: "이벤트 픽업 10연",
        regret_score: 2,
        user_games: { games: userGames[0].games },
      },
      {
        id: "30000000-0000-4000-8000-000000000002",
        user_id: "demo-user",
        user_game_id: userGames[1].id,
        amount: 59000,
        type: "coin",
        paid_at: new Date(range.start.getTime() + 5 * 86400000).toISOString(),
        memo: "초회 보너스 충전",
        regret_score: 4,
        user_games: { games: userGames[1].games },
      },
      {
        id: "30000000-0000-4000-8000-000000000003",
        user_id: "demo-user",
        user_game_id: userGames[2].id,
        amount: 11000,
        type: "pass",
        paid_at: new Date(range.start.getTime() + 7 * 86400000).toISOString(),
        memo: "월간 패스",
        regret_score: 5,
        user_games: { games: userGames[2].games },
      },
      {
        id: "30000000-0000-4000-8000-000000000004",
        user_id: "demo-user",
        user_game_id: userGames[0].id,
        amount: 33000,
        type: "gacha",
        paid_at: new Date(range.start.getTime() + 12 * 86400000).toISOString(),
        memo: "천장까지 조금만",
        regret_score: 1,
        user_games: { games: userGames[0].games },
      },
    ],
    gachaLogs: [
      {
        id: "40000000-0000-4000-8000-000000000001",
        user_game_id: userGames[0].id,
        pulls: 10,
        result: "픽업 실패",
        pity_at_pull: 67,
        pulled_at: new Date(range.start.getTime() + 12 * 86400000).toISOString(),
      },
      {
        id: "40000000-0000-4000-8000-000000000002",
        user_game_id: userGames[1].id,
        pulls: 10,
        result: "상시 5성",
        pity_at_pull: 42,
        pulled_at: new Date(range.start.getTime() + 5 * 86400000).toISOString(),
      },
    ],
  };
}
