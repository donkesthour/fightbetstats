(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.buildBetSearchTerms = api.buildBetSearchTerms;
    root.normalizeSearchQuery = api.normalizeSearchQuery;
    root.readTrackerIndexedState = api.readTrackerIndexedState;
    root.searchIndexedBets = api.searchIndexedBets;
    root.syncTrackerIndexedState = api.syncTrackerIndexedState;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DB_NAME = 'ufc_bet_tracker';
  const DB_VERSION = 1;
  const STATE_STORE = 'tracker_state';
  const BETS_STORE = 'bets';
  const STATE_KEY = 'current';

  function normalizeSearchQuery(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .replace(/\bvs\.?\b/g, 'vs')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
  }

  function getBetSearchText(bet) {
    const legs = Array.isArray(bet && bet.legs) ? bet.legs : [];
    const legText = legs.map(leg => [leg.fightName, leg.selection, leg.betType].join(' ')).join(' ');
    const tags = Array.isArray(bet && bet.tags) ? bet.tags.join(' ') : (bet && bet.tags);

    return [
      bet && bet.selection,
      bet && bet.fightName,
      bet && bet.notes,
      bet && bet.betType,
      bet && bet.book,
      bet && bet.result,
      tags,
      legText,
    ].join(' ');
  }

  function buildBetSearchTerms(bet) {
    const tokens = normalizeSearchQuery(getBetSearchText(bet));
    const terms = new Set(tokens);
    tokens.forEach(token => {
      for (let length = 2; length < token.length; length += 1) {
        terms.add(token.slice(0, length));
      }
    });
    return Array.from(terms);
  }

  function indexedBet(bet) {
    return { ...bet, searchTerms: buildBetSearchTerms(bet) };
  }

  function openTrackerDatabase() {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);

    return new Promise((resolve, reject) => {
      let request;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        reject(error);
        return;
      }

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STATE_STORE)) {
          db.createObjectStore(STATE_STORE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(BETS_STORE)) {
          const bets = db.createObjectStore(BETS_STORE, { keyPath: 'id' });
          bets.createIndex('eventId', 'eventId', { unique: false });
          bets.createIndex('result', 'result', { unique: false });
          bets.createIndex('book', 'book', { unique: false });
          bets.createIndex('searchTerms', 'searchTerms', { unique: false, multiEntry: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open IndexedDB.'));
      request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another open tab.'));
    });
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction was aborted.'));
    });
  }

  async function readTrackerIndexedState() {
    const db = await openTrackerDatabase();
    if (!db) return null;
    try {
      const transaction = db.transaction(STATE_STORE, 'readonly');
      const stored = await requestResult(transaction.objectStore(STATE_STORE).get(STATE_KEY));
      await transactionDone(transaction);
      return stored && stored.state ? stored.state : null;
    } finally {
      db.close();
    }
  }

  async function syncTrackerIndexedState(state) {
    const db = await openTrackerDatabase();
    if (!db) return false;
    try {
      const safeState = state && typeof state === 'object' ? state : {};
      const bets = Array.isArray(safeState.bets) ? safeState.bets.filter(bet => bet && bet.id) : [];
      const transaction = db.transaction([STATE_STORE, BETS_STORE], 'readwrite');
      const stateStore = transaction.objectStore(STATE_STORE);
      const betsStore = transaction.objectStore(BETS_STORE);
      stateStore.put({ key: STATE_KEY, state: safeState, updatedAt: safeState.lastUpdated || Date.now() });
      betsStore.clear();
      bets.forEach(bet => betsStore.put(indexedBet(bet)));
      await transactionDone(transaction);
      return true;
    } finally {
      db.close();
    }
  }

  async function searchIndexedBets(query) {
    const terms = normalizeSearchQuery(query);
    if (terms.length === 0) return [];
    const db = await openTrackerDatabase();
    if (!db) return [];
    try {
      const transaction = db.transaction(BETS_STORE, 'readonly');
      const index = transaction.objectStore(BETS_STORE).index('searchTerms');
      const matches = await Promise.all(terms.map(term => requestResult(index.getAll(term))));
      await transactionDone(transaction);

      const matchingIds = matches.reduce((ids, group, indexPosition) => {
        const groupIds = new Set(group.map(bet => String(bet.id)));
        if (indexPosition === 0) return groupIds;
        return new Set(Array.from(ids).filter(id => groupIds.has(id)));
      }, new Set());

      return (matches[0] || []).filter(bet => matchingIds.has(String(bet.id)));
    } finally {
      db.close();
    }
  }

  return {
    DB_NAME,
    DB_VERSION,
    buildBetSearchTerms,
    getBetSearchText,
    normalizeSearchQuery,
    readTrackerIndexedState,
    searchIndexedBets,
    syncTrackerIndexedState,
  };
});
