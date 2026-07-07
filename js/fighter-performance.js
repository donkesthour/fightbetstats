(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.calculateFighterPerformance = api.calculateFighterPerformance;
    root.extractFighterNameFromSelection = api.extractFighterNameFromSelection;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function toNumber(value) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function splitFightName(fightName) {
    const text = normalizeName(fightName);
    if (!text) return [];
    return text.split(/\s+vs\.?\s+/i).map(normalizeName).filter(Boolean);
  }

  function stripSelectionSuffixes(selection) {
    return normalizeName(selection)
      .replace(/\s+by\s+.*$/i, '')
      .replace(/\s+(to win|wins?).*$/i, '')
      .replace(/\s+(moneyline|ml)$/i, '')
      .replace(/\s+\+\s+.*$/i, '')
      .trim();
  }

  function extractFighterNameFromSelection(selection, fightName) {
    const cleanSelection = stripSelectionSuffixes(selection);
    if (!cleanSelection) return null;

    const fighters = splitFightName(fightName);
    const lowerSelection = cleanSelection.toLowerCase();
    const exact = fighters.find(fighter => fighter.toLowerCase() === lowerSelection);
    if (exact) return exact;

    const contained = fighters.find(fighter => {
      const lowerFighter = fighter.toLowerCase();
      const lastName = lowerFighter.split(/\s+/).pop();
      return lowerSelection.includes(lowerFighter) || lowerSelection === lastName;
    });
    if (contained) return contained;

    if (/\b(over|under|round|distance|draw|starts?|goes?)\b/i.test(cleanSelection)) return null;
    return cleanSelection;
  }

  function makeRow(fighter) {
    return {
      fighter,
      category: fighter,
      total: 0,
      wins: 0,
      losses: 0,
      voids: 0,
      pending: 0,
      wagered: 0,
      profit: 0,
      winRate: 0,
      roi: 0,
    };
  }

  function getRow(map, fighter) {
    const key = normalizeName(fighter) || 'Unspecified Fighter';
    if (!map.has(key)) map.set(key, makeRow(key));
    return map.get(key);
  }

  function passesFilters(bet, options) {
    if (!bet) return false;
    if (options.eventId && options.eventId !== 'all' && bet.eventId !== options.eventId) return false;
    if (options.book && options.book !== 'all' && bet.book !== options.book) return false;
    if (options.status === 'settled' && bet.result === 'Pending') return false;
    if (options.status === 'pending' && bet.result !== 'Pending') return false;
    if (options.live === 'live' && !bet.isLiveStream) return false;
    if (options.live === 'prematch' && bet.isLiveStream) return false;
    return true;
  }

  function addResult(row, result, wager, payout, isBonusBet) {
    row.total += 1;
    if (!isBonusBet) row.wagered += wager;

    if (result === 'Win') {
      row.wins += 1;
      row.profit += isBonusBet ? payout : payout - wager;
    } else if (result === 'Loss') {
      row.losses += 1;
      if (!isBonusBet) row.profit -= wager;
    } else if (result === 'Void') {
      row.voids += 1;
    } else {
      row.pending += 1;
    }
  }

  function addSingleBet(map, bet) {
    const fighter = extractFighterNameFromSelection(bet.selection, bet.fightName);
    if (!fighter) return;
    addResult(getRow(map, fighter), bet.result, toNumber(bet.wager), toNumber(bet.payout), !!bet.isBonusBet);
  }

  function addParlayBet(map, bet) {
    const legs = Array.isArray(bet.legs) ? bet.legs : [];
    if (!legs.length) return;

    const splitWager = toNumber(bet.wager) / legs.length;
    const splitPayout = toNumber(bet.payout) / legs.length;
    legs.forEach(leg => {
      const fighter = extractFighterNameFromSelection(leg && leg.selection, leg && leg.fightName);
      if (!fighter) return;
      const legResult = leg.result || bet.result;
      const legPayout = bet.result === 'Pending' && legResult !== 'Loss' ? splitWager : splitPayout;
      addResult(getRow(map, fighter), legResult, splitWager, legPayout, !!bet.isBonusBet);
    });
  }

  function calculateRates(row) {
    const settled = row.wins + row.losses;
    row.winRate = settled > 0 ? (row.wins / settled) * 100 : 0;
    row.roi = row.wagered > 0 ? (row.profit / row.wagered) * 100 : 0;
    return row;
  }

  function calculateFighterPerformance(bets, options = {}) {
    const map = new Map();
    const rows = Array.isArray(bets) ? bets : [];

    rows.forEach(bet => {
      if (!passesFilters(bet, options)) return;
      if (bet.isParlay) addParlayBet(map, bet);
      else addSingleBet(map, bet);
    });

    return Array.from(map.values())
      .map(calculateRates)
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.profit !== a.profit) return b.profit - a.profit;
        return a.fighter.localeCompare(b.fighter);
      });
  }

  return {
    calculateFighterPerformance,
    extractFighterNameFromSelection,
  };
});
