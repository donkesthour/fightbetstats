(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.calculateRiskMap = api.calculateRiskMap;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function toNumber(value) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function label(value, fallback) {
    const text = value === undefined || value === null ? '' : String(value).trim();
    return text || fallback;
  }

  function addPosition(groups, fightName, selection, values) {
    const key = label(fightName, 'Unspecified matchup');
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        cashStake: 0,
        possibleProfit: 0,
        positions: 0,
        selections: new Set(),
      });
    }

    const group = groups.get(key);
    group.cashStake += values.cashStake;
    group.possibleProfit += values.possibleProfit;
    group.positions += 1;
    group.selections.add(label(selection, 'Unspecified selection'));
  }

  function addBetToMap(groups, bet) {
    const wager = bet && bet.isBonusBet ? 0 : toNumber(bet && bet.wager);
    const payout = toNumber(bet && bet.payout);
    const profit = bet && bet.isBonusBet ? payout : payout - toNumber(bet && bet.wager);
    const legs = bet && bet.isParlay && Array.isArray(bet.legs) ? bet.legs.filter(Boolean) : [];

    if (!legs.length) {
      addPosition(groups, bet && bet.fightName, bet && bet.selection, { cashStake: wager, possibleProfit: profit });
      return;
    }

    legs.forEach(leg => {
      addPosition(groups, leg.fightName, leg.selection, {
        cashStake: wager / legs.length,
        possibleProfit: profit / legs.length,
      });
    });
  }

  function riskLevel(score) {
    if (score >= 70) return 'high';
    if (score >= 35) return 'elevated';
    return 'guarded';
  }

  function calculateRiskMap(bets, options = {}) {
    const unitSize = toNumber(options.unitSize) > 0 ? toNumber(options.unitSize) : 10;
    const eventId = options.eventId;
    const pendingBets = (Array.isArray(bets) ? bets : []).filter(bet => {
      if (!bet || bet.result !== 'Pending') return false;
      return !eventId || eventId === 'all' || bet.eventId === eventId;
    });
    const groups = new Map();
    pendingBets.forEach(bet => addBetToMap(groups, bet));

    const totalCashStake = Array.from(groups.values()).reduce((sum, group) => sum + group.cashStake, 0);
    const fights = Array.from(groups.values())
      .map(group => {
        const concentration = totalCashStake > 0 ? (group.cashStake / totalCashStake) * 100 : 0;
        const unitsAtRisk = group.cashStake / unitSize;
        // A single 3u+ decision is as actionable as a heavily concentrated card.
        const score = Math.min(100, Math.round(Math.max(concentration, (unitsAtRisk / 3) * 100)));
        return {
          key: group.key,
          cashStake: group.cashStake,
          possibleProfit: group.possibleProfit,
          positions: group.positions,
          selections: Array.from(group.selections).sort(),
          concentration,
          unitsAtRisk,
          score,
          level: riskLevel(score),
        };
      })
      .sort((a, b) => b.score - a.score || b.cashStake - a.cashStake || a.key.localeCompare(b.key));

    return {
      count: pendingBets.length,
      totalCashStake,
      fights,
      highestRisk: fights[0] || null,
      concentration: fights[0] ? fights[0].concentration : 0,
      highRiskCount: fights.filter(fight => fight.level === 'high').length,
    };
  }

  return { calculateRiskMap };
});
