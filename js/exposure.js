(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.calculatePendingExposure = api.calculatePendingExposure;
    root.formatExposureRowLabel = api.formatExposureRowLabel;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function toNumber(value) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatExposureRowLabel(value) {
    const text = value === undefined || value === null ? '' : String(value).trim();
    return text || 'Unspecified';
  }

  function makeGroup(key) {
    return {
      key: formatExposureRowLabel(key),
      count: 0,
      cashStake: 0,
      possibleReturn: 0,
      possibleProfit: 0,
    };
  }

  function addToGroup(map, key, values) {
    const safeKey = formatExposureRowLabel(key);
    if (!map.has(safeKey)) map.set(safeKey, makeGroup(safeKey));

    const group = map.get(safeKey);
    group.count += values.count || 1;
    group.cashStake += values.cashStake || 0;
    group.possibleReturn += values.possibleReturn || 0;
    group.possibleProfit += values.possibleProfit || 0;
  }

  function sortGroups(map) {
    return Array.from(map.values()).sort((a, b) => {
      if (b.cashStake !== a.cashStake) return b.cashStake - a.cashStake;
      return a.key.localeCompare(b.key);
    });
  }

  function getPendingBets(bets, eventId) {
    if (!Array.isArray(bets)) return [];
    return bets.filter(bet => {
      if (!bet || bet.result !== 'Pending') return false;
      return !eventId || eventId === 'all' || bet.eventId === eventId;
    });
  }

  function getBetPossibleValues(bet) {
    const wager = toNumber(bet && bet.wager);
    const payout = toNumber(bet && bet.payout);
    const cashStake = bet && bet.isBonusBet ? 0 : wager;
    const possibleReturn = payout;
    const possibleProfit = bet && bet.isBonusBet ? payout : payout - wager;

    return { cashStake, possibleReturn, possibleProfit };
  }

  function addFightExposure(byFight, bet, values) {
    const legs = bet && bet.isParlay && Array.isArray(bet.legs) ? bet.legs : [];
    if (!legs.length) {
      addToGroup(byFight, bet && bet.fightName, values);
      return;
    }

    const splitValues = {
      count: 1,
      cashStake: values.cashStake / legs.length,
      possibleReturn: values.possibleReturn / legs.length,
      possibleProfit: values.possibleProfit / legs.length,
    };

    legs.forEach(leg => addToGroup(byFight, leg && leg.fightName, splitValues));
  }

  function calculatePendingExposure(bets, options = {}) {
    const unitSize = toNumber(options.unitSize) > 0 ? toNumber(options.unitSize) : 10;
    const pendingBets = getPendingBets(bets, options.eventId);
    const byBook = new Map();
    const byFight = new Map();
    const bySelection = new Map();

    const summary = {
      count: pendingBets.length,
      singles: 0,
      parlays: 0,
      cashStake: 0,
      possibleReturn: 0,
      possibleProfit: 0,
      unitsAtRisk: 0,
      byBook: [],
      byFight: [],
      bySelection: [],
      biggestSelection: null,
    };

    pendingBets.forEach(bet => {
      const values = getBetPossibleValues(bet);
      if (bet && bet.isParlay) summary.parlays += 1;
      else summary.singles += 1;

      summary.cashStake += values.cashStake;
      summary.possibleReturn += values.possibleReturn;
      summary.possibleProfit += values.possibleProfit;

      addToGroup(byBook, bet && bet.book, values);
      addFightExposure(byFight, bet, values);
      addToGroup(bySelection, bet && bet.selection, values);
    });

    summary.unitsAtRisk = summary.cashStake / unitSize;
    summary.byBook = sortGroups(byBook);
    summary.byFight = sortGroups(byFight);
    summary.bySelection = sortGroups(bySelection);
    summary.biggestSelection = summary.bySelection[0] || null;

    return summary;
  }

  return {
    calculatePendingExposure,
    formatExposureRowLabel,
  };
});
