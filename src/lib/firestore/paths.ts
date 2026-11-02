export function userDocPath(uid: string) {
  return `users/${uid}`;
}

export function userGamesColPath(uid: string) {
  return `users/${uid}/games`;
}

export function userGameDocPath(uid: string, entryId: string) {
  return `users/${uid}/games/${entryId}`;
}

export function gameStatesColPath(uid: string) {
  return `users/${uid}/gacha/main/gameStates`;
}

export function gameStateDocPath(uid: string, entryId: string) {
  return `users/${uid}/gacha/main/gameStates/${entryId}`;
}

export function budgetsColPath(uid: string) {
  return `users/${uid}/gacha/main/budgets`;
}

export function budgetDocPath(uid: string, yearMonth: string) {
  return `users/${uid}/gacha/main/budgets/${yearMonth}`;
}

export function paymentsColPath(uid: string) {
  return `users/${uid}/gacha/main/payments`;
}

export function paymentDocPath(uid: string, paymentId: string) {
  return `users/${uid}/gacha/main/payments/${paymentId}`;
}

export function paymentTemplatesColPath(uid: string) {
  return `users/${uid}/gacha/main/paymentTemplates`;
}

export function paymentTemplateDocPath(uid: string, id: string) {
  return `users/${uid}/gacha/main/paymentTemplates/${id}`;
}

export function privateBannersColPath(uid: string) {
  return `users/${uid}/gacha/main/banners`;
}

export function privateBannerDocPath(uid: string, bannerId: string) {
  return `users/${uid}/gacha/main/banners/${bannerId}`;
}

export function publicBannersColPath() {
  return `modules/gacha/banners`;
}

export function publicBannerDocPath(bannerId: string) {
  return `modules/gacha/banners/${bannerId}`;
}

export function userBannersColPath(uid: string) {
  return `users/${uid}/gacha/main/userBanners`;
}

export function userBannerDocPath(uid: string, trackingId: string) {
  return `users/${uid}/gacha/main/userBanners/${trackingId}`;
}

export function pullSessionsColPath(uid: string) {
  return `users/${uid}/gacha/main/pullSessions`;
}

export function pullSessionDocPath(uid: string, sessionId: string) {
  return `users/${uid}/gacha/main/pullSessions/${sessionId}`;
}

export function pullsColPath(uid: string) {
  return `users/${uid}/gacha/main/pulls`;
}

export function pullDocPath(uid: string, pullId: string) {
  return `users/${uid}/gacha/main/pulls/${pullId}`;
}

export function gachaLogsColPath(uid: string) {
  return `users/${uid}/gacha/main/gachaLogs`;
}

export function gachaLogDocPath(uid: string, id: string) {
  return `users/${uid}/gacha/main/gachaLogs/${id}`;
}

export function guardrailRulesColPath(uid: string) {
  return `users/${uid}/gacha/main/guardrailRules`;
}

export function guardrailRuleDocPath(uid: string, id: string) {
  return `users/${uid}/gacha/main/guardrailRules/${id}`;
}

export function gamesColPath() {
  return `games`;
}

export function gameDocPath(gameId: string) {
  return `games/${gameId}`;
}
