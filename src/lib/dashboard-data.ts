import { Timestamp } from "firebase-admin/firestore";
import { getMonthRange } from "@/lib/domain/calculations";
import type {
  BudgetRecord,
  DashboardData,
  GachaLogRecord,
  GuardrailRule,
} from "@/lib/domain/dashboard";
import { getDemoDashboardData } from "@/lib/domain/demo-data";
import { getAdminDb } from "@/lib/firebase/admin";
import { hasFirebaseEnv } from "@/lib/firebase/env";
import { getSessionUser } from "@/lib/firebase/session";
import {
  bannerDocSchema,
  budgetDocSchema,
  gachaLogDocSchema,
  gameConfigDocSchema,
  gameDocSchema,
  gameStateDocSchema,
  guardrailRuleDocSchema,
  paymentDocSchema,
  preferencesDocSchema,
  pullDocSchema,
  pullSessionDocSchema,
  sharedUserGameDocSchema,
  userBannerDocSchema,
  userDocSchema,
} from "./firestore/read-schemas";
import {
  projectBanners,
  projectGameMasters,
  projectUserBanners,
  projectUserGames,
} from "./firestore/read-projections";
import {
  projectPayments,
  projectProfile,
  projectPulls,
  projectPullSessions,
} from "./firestore/read-records";

function assertLimit<T>(docs: T[], limit: number, entityName: string): T[] {
  if (docs.length > limit) {
    throw new Error(`${entityName} 조회 결과가 한도(${limit}건)를 초과했습니다.`);
  }
  return docs;
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const range = getMonthRange();
  if (!hasFirebaseEnv()) {
    return getDemoDashboardData({ authEnabled: false });
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return getDemoDashboardData({ authEnabled: true });
  }

  const uid = sessionUser.uid;
  const db = getAdminDb();
  const startTs = Timestamp.fromDate(range.start);
  const endTs = Timestamp.fromDate(range.end);

  const [
    userSnap,
    prefSnap,
    gamesSnap,
    configsSnap,
    userGamesSnap,
    gameStatesSnap,
    budgetSnap,
    paymentsSnap,
    gachaLogsSnap,
    publicBannersSnap,
    privateBannersSnap,
    userBannersSnap,
    pullSessionsSnap,
    pullsSnap,
    guardrailRulesSnap,
  ] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`users/${uid}/gacha/main/settings/preferences`).get(),
    db.collection("games").limit(501).get(),
    db.collection("modules/gacha/gameConfigs").limit(501).get(),
    db.collection(`users/${uid}/games`).limit(101).get(),
    db.collection(`users/${uid}/gacha/main/gameStates`).limit(101).get(),
    db.doc(`users/${uid}/gacha/main/budgets/${range.yearMonth}`).get(),
    db.collection(`users/${uid}/gacha/main/payments`)
      .where("paid_at", ">=", startTs)
      .where("paid_at", "<", endTs)
      .orderBy("paid_at", "desc")
      .limit(1001)
      .get(),
    db.collection(`users/${uid}/gacha/main/gachaLogs`)
      .orderBy("pulled_at", "desc")
      .limit(12)
      .get(),
    db.collection("modules/gacha/banners")
      .where("is_active", "==", true)
      .limit(501)
      .get(),
    db.collection(`users/${uid}/gacha/main/banners`)
      .where("is_active", "==", true)
      .limit(101)
      .get(),
    db.collection(`users/${uid}/gacha/main/userBanners`)
      .where("is_tracking", "==", true)
      .limit(101)
      .get(),
    db.collection(`users/${uid}/gacha/main/pullSessions`)
      .orderBy("pulled_at", "desc")
      .limit(30)
      .get(),
    db.collection(`users/${uid}/gacha/main/pulls`)
      .orderBy("pulled_at", "desc")
      .limit(100)
      .get(),
    db.collection(`users/${uid}/gacha/main/guardrailRules`)
      .limit(51)
      .get(),
  ]);

  const rawGames = assertLimit(gamesSnap.docs, 500, "게임 카탈로그");
  const rawConfigs = assertLimit(configsSnap.docs, 500, "게임 마스터 설정");
  const rawUserGames = assertLimit(userGamesSnap.docs, 100, "보유 게임 목록");
  const rawGameStates = assertLimit(gameStatesSnap.docs, 100, "게임 상태 목록");
  const rawPayments = assertLimit(paymentsSnap.docs, 1000, "월간 결제 내역");
  const rawPublicBanners = assertLimit(publicBannersSnap.docs, 500, "공개 배너 목록");
  const rawPrivateBanners = assertLimit(privateBannersSnap.docs, 100, "개인 배너 목록");
  const rawUserBanners = assertLimit(userBannersSnap.docs, 100, "트래킹 배너 목록");
  const rawRules = assertLimit(guardrailRulesSnap.docs, 50, "보호 규칙 목록");

  const userDocData = userSnap.exists ? userDocSchema.parse(userSnap.data()) : null;
  const prefData = prefSnap.exists ? preferencesDocSchema.parse(prefSnap.data()) : null;
  const profile = projectProfile(uid, sessionUser, userDocData, prefData);

  const budget: BudgetRecord | null = budgetSnap.exists
    ? (() => {
        const parsed = budgetDocSchema.parse(budgetSnap.data());
        return {
          id: budgetSnap.id,
          year_month: parsed.year_month,
          total_budget: parsed.total_budget,
          warning_at: parsed.warning_at,
        };
      })()
    : null;

  const configsMap = new Map(rawConfigs.map((d) => [d.id, gameConfigDocSchema.parse(d.data())]));
  const parsedGames = rawGames.map((d) => ({ id: d.id, data: gameDocSchema.parse(d.data()) }));
  const { games, gamesMap } = projectGameMasters(parsedGames, configsMap);

  const gameStatesMap = new Map(rawGameStates.map((d) => [d.id, gameStateDocSchema.parse(d.data())]));
  const parsedUserGames = rawUserGames.map((d) => ({ id: d.id, data: sharedUserGameDocSchema.parse(d.data()) }));
  const { userGames, userGamesMap } = projectUserGames(uid, parsedUserGames, gameStatesMap, gamesMap);

  const allBanners = [
    ...rawPublicBanners.map((d) => ({ id: d.id, data: bannerDocSchema.parse(d.data()) })),
    ...rawPrivateBanners.map((d) => ({ id: d.id, data: bannerDocSchema.parse(d.data()) })),
  ];
  const { banners, bannersMap } = projectBanners(allBanners, gamesMap);

  const parsedUserBanners = rawUserBanners.map((d) => ({ id: d.id, data: userBannerDocSchema.parse(d.data()) }));
  const { userBanners, userBannersMap } = projectUserBanners(uid, parsedUserBanners, bannersMap, userGamesMap, gamesMap);

  const parsedPayments = rawPayments.map((d) => ({ id: d.id, data: paymentDocSchema.parse(d.data()) }));
  const payments = projectPayments(uid, parsedPayments, userGamesMap);

  const gachaLogs: GachaLogRecord[] = gachaLogsSnap.docs.map((d) => {
    const parsed = gachaLogDocSchema.parse(d.data());
    return {
      id: d.id,
      user_game_id: parsed.user_game_id,
      pulls: parsed.pulls,
      result: parsed.result,
      pity_at_pull: parsed.pity_at_pull,
      pulled_at: parsed.pulled_at,
    };
  });

  const parsedSessions = pullSessionsSnap.docs.map((d) => ({ id: d.id, data: pullSessionDocSchema.parse(d.data()) }));
  const pullSessions = projectPullSessions(uid, parsedSessions, userBannersMap);

  const parsedPulls = pullsSnap.docs.map((d) => ({ id: d.id, data: pullDocSchema.parse(d.data()) }));
  const pulls = projectPulls(uid, parsedPulls, userBannersMap);

  const guardrailRules: GuardrailRule[] = rawRules.map((d) => {
    const parsed = guardrailRuleDocSchema.parse(d.data());
    return {
      id: d.id,
      user_id: uid,
      kind: parsed.kind,
      name: parsed.name,
      threshold_amount: parsed.threshold_amount,
      threshold_percent: parsed.threshold_percent,
      cooldown_days: parsed.cooldown_days,
      enabled: parsed.enabled,
    };
  });

  return {
    isDemo: false,
    authEnabled: true,
    isAuthenticated: true,
    yearMonth: range.yearMonth,
    profile,
    budget,
    games,
    userGames,
    banners,
    userBanners,
    payments,
    gachaLogs,
    pullSessions,
    pulls,
    guardrailRules,
  };
}
