(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.getDefaultActiveEventId = api.getDefaultActiveEventId;
    root.isEventDay = api.isEventDay;
    root.summarizeEventDayPendingBets = api.summarizeEventDayPendingBets;
    root.buildEventDaySummary = api.buildEventDaySummary;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function parseEventDateParts(evt) {
    if (!evt || !evt.date) return null;
    const parts = String(evt.date).split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return { year: parts[0], month: parts[1] - 1, day: parts[2] };
  }

  function parseEventTime(evt, timeKey) {
    const dateParts = parseEventDateParts(evt);
    if (!dateParts) return null;

    const raw = evt && evt[timeKey];
    let hour = timeKey === 'prelimsStart' ? 18 : 22;
    let minute = 0;

    if (raw) {
      const match = String(raw).match(/(\d+):?(\d*)\s*(AM|PM)/i);
      if (match) {
        hour = parseInt(match[1], 10);
        minute = parseInt(match[2] || '0', 10);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
      }
    }

    return new Date(dateParts.year, dateParts.month, dateParts.day, hour, minute, 0);
  }

  function getEventEndTime(evt) {
    const startTime = parseEventTime(evt, evt && evt.mainStart ? 'mainStart' : 'prelimsStart');
    if (!startTime) return new Date(0);
    return new Date(startTime.getTime() + 6 * 60 * 60 * 1000);
  }

  function getEventDayWindow(evt, options = {}) {
    const dateParts = parseEventDateParts(evt);
    if (!dateParts) return null;

    const startHour = options.startHour === undefined ? 6 : options.startHour;
    const endBufferHours = options.endBufferHours === undefined ? 6 : options.endBufferHours;
    const mainStart = parseEventTime(evt, evt && evt.mainStart ? 'mainStart' : 'prelimsStart');
    const start = new Date(dateParts.year, dateParts.month, dateParts.day, startHour, 0, 0);
    const endAnchor = mainStart || new Date(dateParts.year, dateParts.month, dateParts.day, 22, 0, 0);
    const end = new Date(endAnchor.getTime() + endBufferHours * 60 * 60 * 1000);

    return { start, end };
  }

  function isEventDay(evt, options = {}) {
    const window = getEventDayWindow(evt, options);
    if (!window) return false;
    const now = options.now || new Date();
    return now >= window.start && now <= window.end;
  }

  function getDefaultActiveEventId(eventList, options = {}) {
    if (!Array.isArray(eventList) || eventList.length === 0) {
      return 'event_mcgregor_vs_holloway';
    }

    const now = options.now || new Date();
    const futureEvents = [];
    const pastEvents = [];

    eventList.forEach(evt => {
      const endTime = getEventEndTime(evt);
      if (endTime > now) {
        futureEvents.push({ event: evt, endTime });
      } else {
        pastEvents.push({ event: evt, endTime });
      }
    });

    if (futureEvents.length > 0) {
      futureEvents.sort((a, b) => a.endTime - b.endTime);
      return futureEvents[0].event.id;
    } else if (pastEvents.length > 0) {
      pastEvents.sort((a, b) => b.endTime - a.endTime);
      return pastEvents[0].event.id;
    }

    return eventList[0].id;
  }

  function asNumber(value) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function addFightExposure(map, fightName, bet, stakeShare, payoutShare) {
    const key = fightName || 'Unspecified';
    if (!map.has(key)) {
      map.set(key, { fightName: key, count: 0, cashStake: 0, possibleReturn: 0, betIds: new Set() });
    }
    const row = map.get(key);
    row.count += 1;
    row.cashStake += stakeShare;
    row.possibleReturn += payoutShare;
    if (bet && bet.id !== undefined) row.betIds.add(bet.id);
  }

  function summarizeEventDayPendingBets(bets, options = {}) {
    const eventId = options.eventId || 'all';
    const byFight = new Map();
    const pending = (Array.isArray(bets) ? bets : []).filter(bet => {
      if (!bet || bet.result !== 'Pending') return false;
      return eventId === 'all' || bet.eventId === eventId;
    });

    pending.forEach(bet => {
      const stake = bet.isBonusBet ? 0 : asNumber(bet.wager);
      const payout = asNumber(bet.payout);
      if (bet.isParlay && Array.isArray(bet.legs) && bet.legs.length > 0) {
        const stakeShare = stake / bet.legs.length;
        const payoutShare = payout / bet.legs.length;
        bet.legs.forEach(leg => addFightExposure(byFight, leg && leg.fightName, bet, stakeShare, payoutShare));
      } else {
        addFightExposure(byFight, bet.fightName, bet, stake, payout);
      }
    });

    const rows = Array.from(byFight.values())
      .map(row => ({
        fightName: row.fightName,
        count: row.count,
        cashStake: row.cashStake,
        possibleReturn: row.possibleReturn,
        possibleProfit: row.possibleReturn - row.cashStake,
        uniqueBetCount: row.betIds.size,
      }))
      .sort((a, b) => b.cashStake - a.cashStake || b.count - a.count || a.fightName.localeCompare(b.fightName));

    return {
      pendingCount: pending.length,
      fightCount: rows.length,
      byFight: rows,
    };
  }

  function getEventStatus(evt, options = {}) {
    if (!evt) return 'No event selected';
    if (isEventDay(evt, options)) return 'Event day';

    const window = getEventDayWindow(evt, options);
    if (!window) return 'Scheduled';
    const now = options.now || new Date();
    if (now < window.start) return 'Upcoming';
    return 'Completed';
  }

  function buildEventDaySummary(evt, bets, options = {}) {
    if (!evt || options.activeEventId === 'all') {
      return { visible: false };
    }

    const pendingSummary = summarizeEventDayPendingBets(bets, { eventId: evt.id });
    const exposure = options.exposure || {};
    const eventDay = isEventDay(evt, options);

    return {
      visible: true,
      eventId: evt.id,
      eventName: evt.name || 'Selected event',
      eventDate: evt.date || '',
      status: getEventStatus(evt, options),
      isEventDay: eventDay,
      pendingCount: exposure.pendingCount === undefined ? pendingSummary.pendingCount : exposure.pendingCount,
      fightCount: pendingSummary.fightCount,
      cashStake: exposure.cashStake === undefined ? 0 : exposure.cashStake,
      possibleReturn: exposure.possibleReturn === undefined ? 0 : exposure.possibleReturn,
      possibleProfit: exposure.possibleProfit === undefined ? 0 : exposure.possibleProfit,
      byFight: pendingSummary.byFight,
    };
  }

  return {
    getDefaultActiveEventId,
    getEventDayWindow,
    isEventDay,
    summarizeEventDayPendingBets,
    buildEventDaySummary,
  };
});
