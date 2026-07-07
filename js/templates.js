(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UFC_Templates = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function asText(value) {
    if (value === null || value === undefined) return '';
    return String(value);
  }

  function getPathValue(data, path) {
    return path.split('.').reduce((value, part) => {
      if (value === null || value === undefined) return undefined;
      return value[part.trim()];
    }, data);
  }

  function fillTemplate(template, data) {
    return asText(template).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => asText(getPathValue(data || {}, key)));
  }

  function renderList(items) {
    return (items || [])
      .map(asText)
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => `- ${item}`)
      .join('\n');
  }

  function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `$${amount.toFixed(2)}`;
  }

  function formatSignedCurrency(value) {
    const amount = Number(value) || 0;
    return `${amount >= 0 ? '+' : '-'}$${Math.abs(amount).toFixed(2)}`;
  }

  function formatOdds(value) {
    if (value === null || value === undefined || value === '') return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return asText(value);
    return num > 0 ? `+${num}` : String(num);
  }

  function formatPercent(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    const pct = num <= 1 ? num * 100 : num;
    return `${Math.round(pct)}%`;
  }

  function normalizeResult(result) {
    return result || 'Pending';
  }

  function betNetProfit(bet) {
    const wager = Number(bet.wager) || 0;
    const payout = Number(bet.payout) || 0;
    if (bet.result === 'Win') return bet.isBonusBet ? payout : payout - wager;
    if (bet.result === 'Loss') return bet.isBonusBet ? 0 : -wager;
    if (bet.result === 'Void') return 0;
    return 0;
  }

  function renderBetSelection(bet) {
    if (bet.isParlay && Array.isArray(bet.legs)) {
      return `Parlay (${bet.legs.length} Legs): ${bet.legs.map(leg => `${asText(leg.selection)} ${formatOdds(leg.odds)}`.trim()).join('; ')}`;
    }
    return asText(bet.selection || bet.fighter || '—');
  }

  function renderBetMatchup(bet) {
    if (bet.isParlay && Array.isArray(bet.legs)) {
      return bet.legs.map(leg => asText(leg.fightName || leg.matchup)).filter(Boolean).join('; ') || 'Multiple fights';
    }
    return asText(bet.fightName || bet.matchup || '—');
  }

  function renderBetReport(betData, options) {
    const bets = Array.isArray(betData) ? betData : [];
    const title = (options && options.title) || 'Betting Summary Report';
    if (bets.length === 0) return `## ${title}\n\nNo bets found for this report.`;

    const settled = bets.filter(bet => bet.result && bet.result !== 'Pending');
    const wins = bets.filter(bet => bet.result === 'Win').length;
    const losses = bets.filter(bet => bet.result === 'Loss').length;
    const voids = bets.filter(bet => bet.result === 'Void').length;
    const wagered = bets.reduce((sum, bet) => sum + (bet.isBonusBet ? 0 : (Number(bet.wager) || 0)), 0);
    const net = bets.reduce((sum, bet) => sum + betNetProfit(bet), 0);
    const roi = wagered > 0 ? (net / wagered) * 100 : 0;

    let md = `## ${title}\n\n`;
    md += `| Metric | Value |\n| :--- | :--- |\n`;
    md += `| **Total Bets** | \`${bets.length}\` |\n`;
    md += `| **Settled Bets** | \`${settled.length}\` |\n`;
    md += `| **Record (W-L-V)** | \`${wins}-${losses}-${voids}\` |\n`;
    md += `| **Total Wagered** | \`${formatCurrency(wagered)}\` |\n`;
    md += `| **Net Profit/Loss** | \`${formatSignedCurrency(net)}\` |\n`;
    md += `| **ROI** | \`${roi.toFixed(1)}%\` |\n\n`;

    md += `### Detailed Bet Log\n\n`;
    md += `| Status | Selection | Fight Matchup | Book | Bet Type | Wager | Odds | Est. Payout | Notes |\n`;
    md += `| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |\n`;
    bets.forEach((bet) => {
      const status = normalizeResult(bet.result);
      const notes = asText(bet.notes).replace(/\n/g, '<br>').replace(/\|/g, '&#124;');
      md += `| ${status} | ${renderBetSelection(bet)} | ${renderBetMatchup(bet)} | ${asText(bet.book || '—')} | ${asText(bet.betType || '—')} | \`${formatCurrency(bet.wager)}\` | \`${formatOdds(bet.odds)}\` | \`${formatCurrency(bet.payout)}\` | ${notes} |\n`;
    });

    return md;
  }

  function renderAnnotatedNote(title, content, options) {
    const date = (options && options.date) || new Date().toISOString().slice(0, 10);
    return `## ${asText(title || 'Untitled Note')}\n\nDate: ${date}\n\n${asText(content).trim()}\n`;
  }

  function normalizeOcrLine(line) {
    if (typeof line === 'string') return { text: line, confidence: undefined };
    return {
      text: asText(line && (line.text || line.raw || line.value)),
      confidence: line && (line.confidence ?? line.score),
    };
  }

  function renderOcrSummary(data) {
    const payload = data || {};
    const rawText = asText(payload.rawText || payload.rawOcr || payload.text).trim();
    const lines = Array.isArray(payload.lines) ? payload.lines.map(normalizeOcrLine) : [];
    const confidenceValues = lines
      .map(line => Number(line.confidence))
      .filter(Number.isFinite);
    if (Number.isFinite(Number(payload.confidence))) confidenceValues.unshift(Number(payload.confidence));
    const avgConfidence = confidenceValues.length
      ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
      : undefined;

    let md = `## OCR Summary\n\n`;
    if (payload.source) md += `Source: ${payload.source}\n\n`;
    md += `| Metric | Value |\n| :--- | :--- |\n`;
    md += `| **Average Confidence** | \`${formatPercent(avgConfidence)}\` |\n`;
    md += `| **Line Count** | \`${lines.length || (rawText ? rawText.split(/\r?\n/).filter(Boolean).length : 0)}\` |\n\n`;

    if (lines.length) {
      md += `### OCR Lines\n\n`;
      md += `| Confidence | Text |\n| :---: | :--- |\n`;
      lines.forEach((line) => {
        md += `| ${formatPercent(line.confidence)} | ${line.text.replace(/\|/g, '&#124;')} |\n`;
      });
      md += `\n`;
    }

    md += `### Raw OCR\n\n`;
    md += '```text\n';
    md += `${rawText}\n`;
    md += '```';
    return md;
  }

  function generateTemplate(templateType, data) {
    const payload = data || {};
    switch (templateType) {
      case 'note':
        return renderAnnotatedNote(payload.title || 'Untitled Note', payload.content || '', payload);
      case 'ocr_summary':
        return renderOcrSummary(payload);
      case 'event_day':
        return renderBetReport(payload.betData || payload.bets || [], { title: payload.title || 'Betting Summary Report' });
      default:
        return 'Error: Unknown template type.';
    }
  }

  return {
    fillTemplate,
    renderList,
    renderBetReport,
    renderAnnotatedNote,
    renderOcrSummary,
    generateTemplate,
  };
});
