import type { SharedUserGame } from "./types";

export const KNOWN_GAMES: Record<string, { name: string; color: string }> = {
  "genshin-impact": { name: "원신", color: "#5bbfdb" },
  "honkai-star-rail": { name: "붕괴: 스타레일", color: "#a882e8" },
  "wuthering-waves": { name: "명조", color: "#62c48a" },
  "blue-archive": { name: "블루 아카이브", color: "#6ab0f0" },
  "nikke": { name: "승리의 여신: 니케", color: "#e87090" },
  "arknights": { name: "명일방주", color: "#e8a870" },
  "zenless-zone-zero": { name: "젠레스 존 제로", color: "#b6d56a" },
  "limbus-company": { name: "림버스 컴퍼니", color: "#df976a" },
};

export const normalizeGameName = (name: string) =>
  name
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[\s:：·._-]+/g, "");

export function resolveCustomGameId(name: string): string {
  const normalized = normalizeGameName(name.trim());
  return (
    "custom-" +
    Array.from(new TextEncoder().encode(normalized), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("")
  );
}

export function createDefaultSharedGame({
  id,
  userId,
  gameId,
  name,
}: {
  id: string;
  userId: string;
  gameId: string;
  name: string;
}): SharedUserGame {
  const now = new Date().toISOString();
  return {
    id,
    user_id: userId,
    game_id: gameId,
    name,
    icon: null,
    intensity: "sub",
    last_access: null,
    current_goal: null,
    weekly_tasks: [],
    weekly_tasks_done: [],
    quests: [],
    next_goal: null,
    urgency: "medium",
    party_memo: null,
    memo: null,
    display_order: 0,
    created_at: now,
    updated_at: now,
    estimated_minutes: 30,
    parties: [],
  };
}
