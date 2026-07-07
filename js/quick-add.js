(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.getFightQuickAddOptions = api.getFightQuickAddOptions;
    root.buildQuickAddPreset = api.buildQuickAddPreset;
    root.formatQuickAddOdds = api.formatQuickAddOdds;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function formatQuickAddOdds(odds) {
    if (odds === null || odds === undefined || odds === '') return '—';
    const parsed = parseInt(odds, 10);
    if (Number.isNaN(parsed)) return '—';
    return parsed > 0 ? `+${parsed}` : `${parsed}`;
  }

  function getSideConfig(fight, side) {
    if (!fight) return null;
    if (side === 'A') {
      return { selection: fight.fighterA, odds: fight.oddsA };
    }
    if (side === 'B') {
      return { selection: fight.fighterB, odds: fight.oddsB };
    }
    return null;
  }

  function getFightQuickAddOptions(fight, fightIndex) {
    if (!fight) return [];
    return ['A', 'B']
      .map(side => {
        const config = getSideConfig(fight, side);
        if (!config || !config.selection) return null;
        const oddsLabel = formatQuickAddOdds(config.odds);
        return {
          side,
          fightIndex,
          selection: config.selection,
          odds: config.odds,
          betType: 'Moneyline',
          label: `${config.selection} ML (${oddsLabel})`,
        };
      })
      .filter(Boolean);
  }

  function buildQuickAddPreset(fight, fightIndex, side, options = {}) {
    const config = getSideConfig(fight, side);
    if (!config || !config.selection) return null;
    return {
      mode: options.mode === 'parlay' ? 'parlay' : 'single',
      fightIndex,
      side,
      selection: config.selection,
      odds: config.odds,
      betType: 'Moneyline',
      shouldAddParlayLeg: !!options.addLeg,
    };
  }

  return {
    getFightQuickAddOptions,
    buildQuickAddPreset,
    formatQuickAddOdds,
  };
});
