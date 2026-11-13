(function (root, factory) {
  const policy = factory();
  if (typeof module === 'object' && module.exports) module.exports = policy;
  root.TORTUWORLD_ACTIVITY_POLICY = policy;
})(globalThis, function () {
  return Object.freeze({
    tapLimitStep(eventsPerSecond) {
      if (!Number.isFinite(eventsPerSecond) || eventsPerSecond <= 3) return 0;
      return eventsPerSecond > 10 ? 100 : 50;
    },
    shouldFinishForLowActivity(eventsPerSecond, elapsedMs) {
      return Number.isFinite(eventsPerSecond)
        && eventsPerSecond >= 0
        && eventsPerSecond <= 1
        && Number.isFinite(elapsedMs)
        && elapsedMs >= 60000;
    },
  });
});
