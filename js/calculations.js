(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.calcPayout = api.calcPayout;
    root.convertAmericanToDecimal = api.convertAmericanToDecimal;
    root.convertDecimalToAmerican = api.convertDecimalToAmerican;
    root.calculateParlayOdds = api.calculateParlayOdds;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function calcPayout(wager, odds, isBonusBet = false) {
    wager = parseFloat(wager);
    odds = parseInt(odds);
    if (isNaN(wager) || isNaN(odds) || wager <= 0) return 0;

    let payout = wager;
    if (odds > 0) {
      payout = wager + (wager * (odds / 100));
    } else if (odds < 0) {
      payout = wager + (wager * (100 / Math.abs(odds)));
    }
    return isBonusBet ? (payout - wager) : payout;
  }

  function convertAmericanToDecimal(odds) {
    odds = parseInt(odds);
    if (isNaN(odds)) return 1.0;
    if (odds > 0) {
      return 1.0 + (odds / 100);
    } else if (odds < 0) {
      return 1.0 + (100 / Math.abs(odds));
    } else {
      return 1.0;
    }
  }

  function convertDecimalToAmerican(decimal) {
    decimal = parseFloat(decimal);
    if (isNaN(decimal) || decimal <= 1.0) return 100;
    if (decimal >= 2.0) {
      return Math.round((decimal - 1.0) * 100);
    } else {
      return Math.round(-100 / (decimal - 1.0));
    }
  }

  function calculateParlayOdds(legs) {
    let combinedDecimal = 1.0;
    let activeLegsCount = 0;

    legs.forEach(leg => {
      if (leg.result === 'Void') {
        combinedDecimal *= 1.0;
      } else {
        const legOdds = parseInt(leg.odds);
        if (!isNaN(legOdds)) {
          combinedDecimal *= convertAmericanToDecimal(legOdds);
          activeLegsCount++;
        }
      }
    });

    if (activeLegsCount === 0) return 100;
    return convertDecimalToAmerican(combinedDecimal);
  }

  return {
    calcPayout,
    convertAmericanToDecimal,
    convertDecimalToAmerican,
    calculateParlayOdds,
  };
});
