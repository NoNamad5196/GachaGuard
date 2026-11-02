import type {
  BannerRecord,
  GameMaster,
  UserBanner,
  UserGame,
} from "@/lib/domain/dashboard";
import type {
  BannerDoc,
  GameConfigDoc,
  GameDoc,
  GameStateDoc,
  SharedUserGameDoc,
  UserBannerDoc,
} from "./read-schemas";

export function getOrCreateGameMaster(
  gameId: string,
  gamesMap: Map<string, GameMaster>,
): GameMaster {
  const existing = gamesMap.get(gameId);
  if (existing) return existing;
  const fallback: GameMaster = {
    id: gameId,
    slug: gameId,
    name: gameId,
    developer: null,
    genre: null,
    soft_pity: null,
    hard_pity: 90,
    base_cost: 0,
    has_guarantee: false,
  };
  gamesMap.set(gameId, fallback);
  return fallback;
}

export function projectGameMasters(
  gamesList: Array<{ id: string; data: GameDoc }>,
  configsMap: Map<string, GameConfigDoc>,
): { games: GameMaster[]; gamesMap: Map<string, GameMaster> } {
  const games: GameMaster[] = [];
  const gamesMap = new Map<string, GameMaster>();

  for (const { id, data } of gamesList) {
    const config = configsMap.get(id);
    const gm: GameMaster = {
      id,
      slug: id,
      name: data.name || id,
      developer: config?.developer ?? null,
      genre: config?.genre ?? null,
      soft_pity: config?.soft_pity ?? null,
      hard_pity: config?.hard_pity ?? 90,
      base_cost: config?.base_cost ?? 0,
      has_guarantee: config?.has_guarantee ?? false,
    };
    games.push(gm);
    gamesMap.set(id, gm);
  }
  games.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return { games, gamesMap };
}

export function projectUserGames(
  uid: string,
  userGameList: Array<{ id: string; data: SharedUserGameDoc }>,
  gameStatesMap: Map<string, GameStateDoc>,
  gamesMap: Map<string, GameMaster>,
): { userGames: UserGame[]; userGamesMap: Map<string, UserGame> } {
  const userGames: UserGame[] = [];
  const userGamesMap = new Map<string, UserGame>();

  for (const { id: entryId, data } of userGameList) {
    if (data.deleted_at) continue;
    const gs = gameStatesMap.get(entryId);
    if (gs && !gs.is_active) continue;

    const game = getOrCreateGameMaster(data.game_id, gamesMap);
    const ug: UserGame = {
      id: entryId,
      user_id: uid,
      game_id: data.game_id,
      nickname: gs?.nickname ?? null,
      current_pity: gs?.current_pity ?? 0,
      monthly_budget: gs?.monthly_budget ?? 0,
      warning_threshold_percent: gs?.warning_threshold_percent ?? 70,
      is_active: true,
      games: game,
    };
    userGames.push(ug);
    userGamesMap.set(entryId, ug);
  }
  return { userGames, userGamesMap };
}

export function projectBanners(
  bannerList: Array<{ id: string; data: BannerDoc }>,
  gamesMap: Map<string, GameMaster>,
): { banners: BannerRecord[]; bannersMap: Map<string, BannerRecord> } {
  const banners: BannerRecord[] = [];
  const bannersMap = new Map<string, BannerRecord>();

  for (const { id, data } of bannerList) {
    const game = getOrCreateGameMaster(data.game_id, gamesMap);
    const record: BannerRecord = {
      id,
      game_id: data.game_id,
      created_by: data.created_by,
      name: data.name,
      banner_type: data.banner_type,
      featured: data.featured,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      soft_pity: data.soft_pity,
      hard_pity: data.hard_pity,
      base_rate: data.base_rate,
      rate_up: data.rate_up,
      is_active: data.is_active,
      is_public: data.is_public,
      source: data.source,
      source_url: data.source_url,
      games: game,
    };
    banners.push(record);
    bannersMap.set(id, record);
  }
  banners.sort((a, b) => a.ends_at.localeCompare(b.ends_at));
  return { banners, bannersMap };
}

export function projectUserBanners(
  uid: string,
  userBannerList: Array<{ id: string; data: UserBannerDoc }>,
  bannersMap: Map<string, BannerRecord>,
  userGamesMap: Map<string, UserGame>,
  gamesMap: Map<string, GameMaster>,
): { userBanners: UserBanner[]; userBannersMap: Map<string, UserBanner> } {
  const userBanners: UserBanner[] = [];
  const userBannersMap = new Map<string, UserBanner>();

  for (const { id: trackingId, data } of userBannerList) {
    if (!data.is_tracking) continue;
    let banner = bannersMap.get(data.banner_id);
    if (!banner) {
      const game = getOrCreateGameMaster(data.game_id, gamesMap);
      banner = {
        id: data.banner_id,
        game_id: data.game_id,
        created_by: null,
        name: data.banner_id,
        banner_type: "character",
        featured: "",
        starts_at: "",
        ends_at: "",
        soft_pity: null,
        hard_pity: 90,
        base_rate: 0.006,
        rate_up: 0.5,
        is_active: true,
        is_public: data.banner_scope === "public",
        source: "unknown",
        source_url: null,
        games: game,
      };
      bannersMap.set(data.banner_id, banner);
    }
    const ub: UserBanner = {
      id: trackingId,
      user_id: uid,
      user_game_id: data.user_game_id,
      banner_id: data.banner_id,
      current_pity: data.current_pity,
      pulls_total: data.pulls_total,
      pulls_5_star: data.pulls_5_star,
      is_tracking: true,
      banners: banner,
      user_games: userGamesMap.get(data.user_game_id),
    };
    userBanners.push(ub);
    userBannersMap.set(trackingId, ub);
  }
  return { userBanners, userBannersMap };
}
