(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.normalizeSpaces = api.normalizeSpaces;
    root.normalizeRoundsText = api.normalizeRoundsText;
    root.cleanOcrOdds = api.cleanOcrOdds;
    root.inferOddsFromWagerPayout = api.inferOddsFromWagerPayout;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // Normalize letters followed by numbers by adding a space (e.g. under2.5 -> under 2.5)
  const normalizeSpaces = (str) => str.replace(/([a-zA-Z]+)(\d+)/g, '$1 $2').replace(/(\d+)([a-zA-Z]+)/g, '$1 $2');

  // Normalize rounds text, ensuring Over Under bets are fully spelled out and do not abbreviate rounds
  const normalizeRoundsText = (str) => {
    if (!str) return str;
    if (str.includes(' + ')) {
      return str.split(' + ').map(s => normalizeRoundsText(s)).join(' + ');
    }
    let val = normalizeSpaces(str);
    // Normalize Over/Under selections: "under 2.5 rnds" -> "under 2.5 rounds"
    val = val.replace(/\b(over|under)\s+(\d+(?:\.\d+)?)\s*(rnds|rnd|roun|rounds?)\b/gi, '$1 $2 rounds');
    // If it is just "under 2.5", append " rounds"
    val = val.replace(/\b(over|under)\s+(\d+(?:\.\d+)?)$/gi, '$1 $2 rounds');
    // For round props, normalize "rnd/rd 1" to "Round 1"
    val = val.replace(/\b(rnd|rd)\s*([1-5])\b/gi, 'Round $2');
    val = val.replace(/\s+/g, ' ').trim();
    if (val.length > 0) {
      val = val.charAt(0).toUpperCase() + val.slice(1);
    }
    return val;
  };

  function cleanOcrOdds(oddsStr) {
    if (!oddsStr) return '';
    let cleaned = oddsStr.trim()
      .replace(/\s+/g, '')
      .replace(/~/g, '-')
      .replace(/[\u2013\u2014]/g, '-');

    if (/[a-zA-Z]/.test(cleaned)) {
      cleaned = cleaned
        .replace(/[tlIiL|/]/g, '1')
        .replace(/[oO]/g, '0')
        .replace(/[sS]/g, '5')
        .replace(/[bB]/g, '8')
        .replace(/[gG]/g, '9')
        .replace(/[zZ]/g, '2');
    }
    cleaned = cleaned.replace(/[^+\-0-9]/g, '');
    if (cleaned && !cleaned.startsWith('+') && !cleaned.startsWith('-')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }

  function inferOddsFromWagerPayout(wagerVal, payoutVal) {
    const w = parseFloat(wagerVal);
    const p = parseFloat(payoutVal);
    if (isNaN(w) || isNaN(p) || w <= 0 || p <= w) return '';

    const profit = p - w;
    let oddsNum = 0;
    if (profit >= w) {
      oddsNum = Math.round((profit / w) * 100);
      return '+' + oddsNum;
    } else {
      oddsNum = Math.round(-(w / profit) * 100);
      return oddsNum.toString();
    }
  }

  return {
    normalizeSpaces,
    normalizeRoundsText,
    cleanOcrOdds,
    inferOddsFromWagerPayout,
  };
});
