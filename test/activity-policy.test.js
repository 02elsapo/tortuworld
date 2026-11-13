const assert = require('node:assert/strict');
const test = require('node:test');
const policy = require('../modules/overlay/public/activity-policy');

test('tap limit rises by 50 or 100 for activity above the rate thresholds', () => {
  assert.equal(policy.tapLimitStep(3), 0);
  assert.equal(policy.tapLimitStep(3.01), 50);
  assert.equal(policy.tapLimitStep(10), 50);
  assert.equal(policy.tapLimitStep(10.01), 100);
});

test('low activity finishes a race only after a full minute at one event per second or less', () => {
  assert.equal(policy.shouldFinishForLowActivity(1, 59999), false);
  assert.equal(policy.shouldFinishForLowActivity(1, 60000), true);
  assert.equal(policy.shouldFinishForLowActivity(1.01, 60000), false);
});
