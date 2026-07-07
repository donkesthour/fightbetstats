(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.DEFAULT_UNIT_SIZE = api.DEFAULT_UNIT_SIZE;
    root.parseUnitSize = api.parseUnitSize;
    root.amountToUnits = api.amountToUnits;
    root.formatUnits = api.formatUnits;
    root.formatAmountWithUnits = api.formatAmountWithUnits;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_UNIT_SIZE = 10;

  function parseUnitSize(value, fallback = DEFAULT_UNIT_SIZE) {
    const parsed = parseFloat(value);
    const fallbackParsed = parseFloat(fallback);
    const safeFallback = !isNaN(fallbackParsed) && fallbackParsed > 0 ? fallbackParsed : DEFAULT_UNIT_SIZE;
    return !isNaN(parsed) && parsed > 0 ? parsed : safeFallback;
  }

  function amountToUnits(amount, unitSize) {
    const parsedAmount = parseFloat(amount);
    const parsedUnitSize = parseUnitSize(unitSize);
    if (isNaN(parsedAmount)) return 0;
    return parsedAmount / parsedUnitSize;
  }

  function formatUnits(units) {
    const parsed = parseFloat(units);
    if (isNaN(parsed)) return '0u';
    return `${Number(parsed.toFixed(2)).toString()}u`;
  }

  function formatAmountWithUnits(amount, unitSize) {
    const parsedAmount = parseFloat(amount) || 0;
    return `$${parsedAmount.toFixed(2)} (${formatUnits(amountToUnits(parsedAmount, unitSize))})`;
  }

  return {
    DEFAULT_UNIT_SIZE,
    parseUnitSize,
    amountToUnits,
    formatUnits,
    formatAmountWithUnits,
  };
});
