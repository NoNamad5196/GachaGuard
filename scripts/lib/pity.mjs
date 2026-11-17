/**
 * Initial pity derivation complying with OtakuS contract.
 *
 * Rules:
 * 1. Explicit initial_pity in source row is validated and used.
 * 2. If initial_pity is null:
 *    - If pulls_total === 0: baseline is current_pity (or 0).
 *    - If granular pulls exist: earliest pull's pity_before minus preceding pulls.
 *    - If no granular pulls and pulls_5_star === 0: current_pity - pulls_total (if >= 0).
 *    - Otherwise: impossible to determine truth without pull records -> report error!
 */
export function deriveInitialPity(ub, pullsForBanner = []) {
  if (ub.initial_pity !== null && ub.initial_pity !== undefined && ub.initial_pity !== "") {
    const num = Number(ub.initial_pity);
    if (!Number.isFinite(num) || num < 0) {
      return { error: `Invalid initial_pity '${ub.initial_pity}' for user_banner '${ub.id}'` };
    }
    return { value: num, derived: false };
  }

  const pullsTotal = Number(ub.pulls_total || 0);
  const currentPity = Number(ub.current_pity || 0);
  const pulls5Star = Number(ub.pulls_5_star || 0);

  // Case 1: No pulls have occurred yet
  if (pullsTotal === 0) {
    return { value: currentPity, derived: true, reason: "zero_pulls" };
  }

  // Case 2: Granular pull history exists
  if (pullsForBanner && pullsForBanner.length > 0) {
    const sorted = [...pullsForBanner].sort((a, b) => {
      const numA = Number(a.pull_number || 0);
      const numB = Number(b.pull_number || 0);
      if (numA !== numB) return numA - numB;
      const timeA = new Date(a.pulled_at || a.created_at || 0).getTime();
      const timeB = new Date(b.pulled_at || b.created_at || 0).getTime();
      return timeA - timeB;
    });

    const earliest = sorted[0];
    if (earliest && earliest.pity_before !== null && earliest.pity_before !== undefined) {
      const pityBefore = Number(earliest.pity_before);
      const pullNum = Number(earliest.pull_number || 1);
      const baseline = pityBefore - (pullNum - 1);
      if (Number.isFinite(baseline) && baseline >= 0) {
        return { value: baseline, derived: true, reason: "pull_history" };
      }
    }
  }

  // Case 3: No granular pulls, but 0 5-star pulls occurred (no pity resets)
  if (pulls5Star === 0) {
    const candidate = currentPity - pullsTotal;
    if (candidate >= 0) {
      return { value: candidate, derived: true, reason: "no_resets_linear" };
    }
  }

  // Case 4: Impossible to reliably derive legacy baseline
  return {
    error: `Cannot derive initial_pity for user_banner '${ub.id}': pulls_total=${pullsTotal}, pulls_5_star=${pulls5Star}, and no granular pull history exists. Explicit initial_pity required by contract.`
  };
}
