const assert = require('node:assert/strict');
const test = require('node:test');
const policy = require('../modules/overlay/public/activity-policy');

test('new LIVE members do not count as interaction activity', () => {
  assert.equal(policy.isInteractionEvent('member'), false);
  assert.equal(policy.isInteractionEvent('chat'), true);
});

test('tap limit rises by 50 or 100 for activity above the rate thresholds', () => {
  assert.equal(policy.tapLimitStep(3), 0);
  assert.equal(policy.tapLimitStep(3.01), 50);
  assert.equal(policy.tapLimitStep(10), 50);
  assert.equal(policy.tapLimitStep(10.01), 100);
});

test('advanced matches with over 1000 interactions wait up to two idle minutes', () => {
  assert.equal(policy.inactivityTimeoutMs(79.99, 1001), 60000);
  assert.equal(policy.inactivityTimeoutMs(80, 1000), 60000);
  assert.equal(policy.inactivityTimeoutMs(80, 1001), 120000);
  assert.equal(policy.shouldFinishForInactivity(119999, 120000), false);
  assert.equal(policy.shouldFinishForInactivity(120000, 120000), true);
});

test('other matches finish after one idle minute', () => {
  assert.equal(policy.inactivityTimeoutMs(20, 50), 60000);
  assert.equal(policy.shouldFinishForInactivity(59999, 60000), false);
  assert.equal(policy.shouldFinishForInactivity(60000, 60000), true);
});

test('inactivity display counts down and resets to the configured timeout', () => {
  assert.equal(policy.inactivityRemainingSeconds(0, 60000), 60);
  assert.equal(policy.inactivityRemainingSeconds(1500, 60000), 59);
  assert.equal(policy.inactivityRemainingSeconds(60000, 60000), 0);
  assert.equal(policy.inactivityRemainingSeconds(0, 120000), 120);
});
