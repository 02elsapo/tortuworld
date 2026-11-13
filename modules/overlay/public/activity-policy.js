(function (root, factory) {
  const policy = factory();
  if (typeof module === 'object' && module.exports) module.exports = policy;
  root.TORTUWORLD_ACTIVITY_POLICY = policy;
})(globalThis, function () {
  return Object.freeze({
    isInteractionEvent(type) {
      return ['chat', 'gift', 'like', 'follow', 'share'].includes(type);
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
  });
});
