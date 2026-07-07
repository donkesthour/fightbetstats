(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.CURRENT_SCHEMA_VERSION = api.CURRENT_SCHEMA_VERSION;
    root.TRACKER_STORAGE_KEYS = api.TRACKER_STORAGE_KEYS;
    root.addTrackerSnapshot = api.addTrackerSnapshot;
    root.createSafeLocalStorage = api.createSafeLocalStorage;
    root.createTrackerSnapshot = api.createTrackerSnapshot;
    root.migrateTrackerState = api.migrateTrackerState;
    root.readTrackerSnapshots = api.readTrackerSnapshots;
    root.readTrackerStorage = api.readTrackerStorage;
    root.writeTrackerSnapshots = api.writeTrackerSnapshots;
    root.writeTrackerStorage = api.writeTrackerStorage;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CURRENT_SCHEMA_VERSION = 1;
  const DEFAULT_MAX_SNAPSHOTS = 10;

  const TRACKER_STORAGE_KEYS = {
    events: 'ufc_bet_tracker_events',
    cards: 'ufc_bet_tracker_cards',
    bets: 'ufc_bet_tracker_bets',
    activeEvent: 'ufc_bet_tracker_active_event',
    lastUpdated: 'ufc_bet_tracker_last_updated',
    layoutMode: 'ufc_bet_tracker_layout_mode',
    unitSize: 'ufc_bet_tracker_unit_size',
    schemaVersion: 'ufc_bet_tracker_schema_version',
    snapshots: 'ufc_bet_tracker_snapshots',
  };

  function createSafeLocalStorage(storage, logger = console) {
    return {
      getItem(key) {
        try {
          return storage.getItem(key);
        } catch (e) {
          logger.warn('Storage getItem failed: ', e);
          return null;
        }
      },
      setItem(key, value) {
        try {
          storage.setItem(key, value);
        } catch (e) {
          logger.warn('Storage setItem failed: ', e);
        }
      }
    };
  }

  function parseJsonOrNull(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  }

  function parsePositiveNumber(value) {
    if (value == null || value === '') return null;
    const parsed = parseFloat(value);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }

  function migrateTrackerState(state = {}) {
    return {
      events: Array.isArray(state.events) ? state.events : [],
      cards: state.cards && typeof state.cards === 'object' && !Array.isArray(state.cards) ? state.cards : {},
      bets: Array.isArray(state.bets) ? state.bets : [],
      activeEventId: state.activeEventId || '',
      lastUpdated: state.lastUpdated ? (parseInt(state.lastUpdated) || 0) : 0,
      unitSize: parsePositiveNumber(state.unitSize),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
  }

  function readTrackerStorage(storage) {
    const savedEvents = storage.getItem(TRACKER_STORAGE_KEYS.events);
    const savedCards = storage.getItem(TRACKER_STORAGE_KEYS.cards);
    const savedBets = storage.getItem(TRACKER_STORAGE_KEYS.bets);
    const savedLastUpdated = storage.getItem(TRACKER_STORAGE_KEYS.lastUpdated);
    const savedSchemaVersion = storage.getItem(TRACKER_STORAGE_KEYS.schemaVersion);

    return migrateTrackerState({
      events: parseJsonOrNull(savedEvents),
      cards: parseJsonOrNull(savedCards),
      bets: parseJsonOrNull(savedBets),
      activeEventId: storage.getItem(TRACKER_STORAGE_KEYS.activeEvent),
      lastUpdated: savedLastUpdated ? (parseInt(savedLastUpdated) || 0) : 0,
      unitSize: storage.getItem(TRACKER_STORAGE_KEYS.unitSize),
      schemaVersion: savedSchemaVersion ? (parseInt(savedSchemaVersion) || 0) : 0,
    });
  }

  function createTrackerSnapshot(state, meta = {}) {
    const createdAt = meta.createdAt !== undefined ? meta.createdAt : Date.now();
    return {
      id: meta.id || `snapshot_${createdAt}`,
      label: meta.label || 'Auto backup',
      reason: meta.reason || 'manual',
      createdAt,
      state: migrateTrackerState({ ...state, lastUpdated: state && state.lastUpdated ? state.lastUpdated : createdAt }),
    };
  }

  function readTrackerSnapshots(storage) {
    const parsed = parseJsonOrNull(storage.getItem(TRACKER_STORAGE_KEYS.snapshots));
    return Array.isArray(parsed) ? parsed.filter(snapshot => snapshot && snapshot.id && snapshot.state) : [];
  }

  function writeTrackerSnapshots(snapshots, storage) {
    storage.setItem(TRACKER_STORAGE_KEYS.snapshots, JSON.stringify(Array.isArray(snapshots) ? snapshots : []));
  }

  function addTrackerSnapshot(state, options = {}) {
    const storage = options.storage;
    const maxSnapshots = options.maxSnapshots || DEFAULT_MAX_SNAPSHOTS;
    const snapshot = createTrackerSnapshot(state, options);
    const snapshots = [snapshot, ...readTrackerSnapshots(storage)].slice(0, maxSnapshots);
    writeTrackerSnapshots(snapshots, storage);
    return snapshot;
  }

  function writeTrackerStorage(state, options = {}) {
    const storage = options.storage;
    const lastUpdated = options.lastUpdated !== undefined ? options.lastUpdated : Date.now();
    const migrated = migrateTrackerState({ ...state, lastUpdated });

    storage.setItem(TRACKER_STORAGE_KEYS.events, JSON.stringify(migrated.events));
    storage.setItem(TRACKER_STORAGE_KEYS.cards, JSON.stringify(migrated.cards));
    storage.setItem(TRACKER_STORAGE_KEYS.bets, JSON.stringify(migrated.bets));
    if (migrated.activeEventId) {
      storage.setItem(TRACKER_STORAGE_KEYS.activeEvent, migrated.activeEventId);
    }
    if (migrated.unitSize !== undefined && migrated.unitSize !== null) {
      storage.setItem(TRACKER_STORAGE_KEYS.unitSize, migrated.unitSize.toString());
    }
    storage.setItem(TRACKER_STORAGE_KEYS.schemaVersion, migrated.schemaVersion.toString());
    storage.setItem(TRACKER_STORAGE_KEYS.lastUpdated, migrated.lastUpdated.toString());
  }

  return {
    CURRENT_SCHEMA_VERSION,
    TRACKER_STORAGE_KEYS,
    addTrackerSnapshot,
    createSafeLocalStorage,
    createTrackerSnapshot,
    migrateTrackerState,
    readTrackerSnapshots,
    readTrackerStorage,
    writeTrackerSnapshots,
    writeTrackerStorage,
  };
});
