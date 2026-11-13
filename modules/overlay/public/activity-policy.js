(function (root, factory) {
  const policy = factory();
  if (typeof module === 'object' && module.exports) module.exports = policy;
  root.TORTUWORLD_ACTIVITY_POLICY = policy;
})(globalThis, function () {
  return Object.freeze({
    isInteractionEvent(type) {
      return ['chat', 'gift', 'like', 'follow', 'share'].includes(type);
    },
    statEventDelta(type, activityCount) {
      if (!['member', 'chat', 'gift', 'like', 'follow', 'share'].includes(type)) return 0;
      if (type !== 'gift' && type !== 'like') return 1;
      const count = Number(activityCount);
      return Number.isFinite(count) && count > 0 ? Math.max(1, Math.floor(count)) : 1;
    },
    formatStatCount(value) {
      const count = Math.max(0, Math.floor(Number(value) || 0));
      if (count < 1000) return String(count);
      if (count < 999500) {
        return `${count < 10000
          ? (count / 1000).toFixed(1).replace(/\.0$/, '')
          : Math.round(count / 1000)}K`;
      }
      return `${count < 1e7
        ? (count / 1e6).toFixed(1).replace(/\.0$/, '')
        : Math.round(count / 1e6)}M`;
    },
    tapLimitStep(eventsPerSecond) {
      if (!Number.isFinite(eventsPerSecond) || eventsPerSecond <= 3) return 0;
      return eventsPerSecond > 10 ? 100 : 50;
    },
    inactivityTimeoutMs(progress, interactionCount) {
      return Number.isFinite(progress)
        && progress >= 80
        && Number.isFinite(interactionCount)
        && interactionCount > 1000
        ? 120000
        : 60000;
    },
    shouldFinishForInactivity(idleMs, timeoutMs) {
      return Number.isFinite(idleMs)
        && Number.isFinite(timeoutMs)
        && idleMs >= timeoutMs;
    },
    inactivityRemainingSeconds(idleMs, timeoutMs) {
      if (!Number.isFinite(idleMs) || !Number.isFinite(timeoutMs)) return 0;
      return Math.max(0, Math.ceil((timeoutMs - Math.max(0, idleMs)) / 1000));
    },
    shouldAwardCup(isFinal, timedOut) {
      return isFinal === true && timedOut !== true;
    },
  });
});
