(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.buildBetDuplicateKey = api.buildBetDuplicateKey;
    root.findDuplicateBets = api.findDuplicateBets;
    root.formatDuplicateBetWarning = api.formatDuplicateBetWarning;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\bvs\.?\b/g, 'vs')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeMoney(value) {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
  }

  function normalizeOdds(value) {
    const str = String(value == null ? '' : value).trim().replace(/^\+/, '');
    const num = parseInt(str, 10);
    return Number.isFinite(num) ? String(num) : '';
  }

  function buildLegKey(leg) {
    return [
      normalizeText(leg && leg.fightName),
      normalizeText(leg && leg.selection),
      normalizeOdds(leg && leg.odds),
    ].join('|');
  }

  function buildBetDuplicateKey(bet) {
    const isParlay = !!(bet && bet.isParlay);
    const legs = isParlay && Array.isArray(bet.legs)
      ? bet.legs.map(buildLegKey).sort().join('~')
      : '';

    return [
      normalizeText(bet && bet.eventId),
      isParlay ? 'parlay' : 'single',
      isParlay ? '' : normalizeText(bet && bet.fightName),
      isParlay ? '' : normalizeText(bet && bet.selection),
      normalizeText(bet && bet.betType),
      normalizeText(bet && bet.book),
      normalizeMoney(bet && bet.wager),
      normalizeOdds(bet && bet.odds),
      legs,
    ].join('::');
  }

  function findDuplicateBets(existingBets, candidateBet, options = {}) {
    if (!candidateBet) return [];
    const ignoreId = options.ignoreId == null ? null : String(options.ignoreId);
    const candidateKey = buildBetDuplicateKey(candidateBet);

    return (Array.isArray(existingBets) ? existingBets : []).filter(bet => {
      if (!bet) return false;
      if (ignoreId !== null && String(bet.id) === ignoreId) return false;
      return buildBetDuplicateKey(bet) === candidateKey;
    });
  }

  function formatOdds(value) {
    const odds = normalizeOdds(value);
    if (!odds) return 'n/a';
    const num = parseInt(odds, 10);
    return num > 0 ? `+${num}` : String(num);
  }

  function formatDuplicateBetWarning(duplicates) {
    const rows = (Array.isArray(duplicates) ? duplicates : []).slice(0, 3).map(bet => {
      const amount = `$${normalizeMoney(bet.wager)}`;
      return `- ${bet.fightName || 'Unknown fight'} | ${bet.selection || 'Unknown selection'} | ${bet.book || 'Book?'} | ${amount} | ${formatOdds(bet.odds)}`;
    });

    const extra = duplicates && duplicates.length > 3 ? `\n...and ${duplicates.length - 3} more.` : '';
    return `Possible duplicate bet found:\n\n${rows.join('\n')}${extra}\n\nAdd it anyway?`;
  }

  return {
    buildBetDuplicateKey,
    findDuplicateBets,
    formatDuplicateBetWarning,
  };
});
