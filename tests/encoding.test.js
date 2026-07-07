const assert = require('node:assert/strict');
const fs = require('node:fs');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const html = fs.readFileSync('index.html', 'utf8');

const mojibakePatterns = [
  'Ãƒâ€”',
  'Ã¢â‚¬â€',
  'Ã¢â‚¬Â¢',
  'Ã¢Å“â€¢',
  'Ã°Å¸â€œÂ',
  'Ã±',
  'â€¢',
];

test('index.html does not contain common visible mojibake sequences', () => {
  for (const pattern of mojibakePatterns) {
    assert.equal(html.includes(pattern), false, `found mojibake sequence: ${pattern}`);
  }
});

test('known previously corrupted UI symbols render as intended characters', () => {
  assert.match(html, /modal-close[^>]*>×<\/button>/);
  assert.match(html, /const formattedOdds = .*: '—';/);
  assert.match(html, /const winRateText = .*: '—';/);
  assert.match(html, /removeOcrMultiBetRow\(this\)[\s\S]*>✕<\/button>/);
  assert.match(html, /## 📝 Active Wagers/);
  assert.match(html, /Adrian Yañez/);
});

test('dynamic pending summary text avoids bullet separators that mojibake on GitHub Pages', () => {
  assert.match(html, /pending across .* - \$\{formatMoney\(summary\.cashStake\)\} at risk - \$\{formatSignedMoney\(summary\.possibleProfit\)\} max profit/);
  assert.match(html, /exposure\.biggestSelection\.key\} - \$\{formatMoney\(exposure\.biggestSelection\.cashStake\)\} at risk/);
});
