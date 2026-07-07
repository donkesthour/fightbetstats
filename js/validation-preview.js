(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.buildValidationPreviewSummary = api.buildValidationPreviewSummary;
    root.formatValidationPreviewImpact = api.formatValidationPreviewImpact;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const RESULT_KEYS = ['Win', 'Loss', 'Void', 'Pending'];

  function makeResultCounts() {
    return RESULT_KEYS.reduce((counts, key) => {
      counts[key] = 0;
      return counts;
    }, {});
  }

  function buildValidationPreviewSummary(conflicts) {
    const rows = Array.isArray(conflicts) ? conflicts : [];
    const summary = {
      total: rows.length,
      singles: 0,
      parlayLegs: 0,
      pendingUpdates: 0,
      settledConflicts: 0,
      byProposedResult: makeResultCounts(),
      hasSettledConflicts: false,
    };

    rows.forEach(row => {
      if (row && row.isParlay) summary.parlayLegs += 1;
      else summary.singles += 1;

      const current = row && row.currentResult ? row.currentResult : 'Pending';
      if (current === 'Pending') summary.pendingUpdates += 1;
      else summary.settledConflicts += 1;

      const proposed = row && row.proposedResult ? row.proposedResult : 'Pending';
      if (summary.byProposedResult[proposed] === undefined) summary.byProposedResult[proposed] = 0;
      summary.byProposedResult[proposed] += 1;
    });

    summary.hasSettledConflicts = summary.settledConflicts > 0;
    return summary;
  }

  function formatValidationPreviewImpact(row) {
    const current = row && row.currentResult ? row.currentResult : 'Pending';
    const proposed = row && row.proposedResult ? row.proposedResult : 'Pending';
    const prefix = row && row.isParlay ? 'Parlay leg: ' : (current !== 'Pending' ? 'Review: ' : '');
    return `${prefix}${current} → ${proposed}`;
  }

  return {
    buildValidationPreviewSummary,
    formatValidationPreviewImpact,
  };
});
