const { eventPriorities } = require('./eventConfig');

function createEventFeedStore({ priorities = eventPriorities } = {}) {
  const queue = [];
  const compare = (first, second) => {
    const priority = (priorities[first.type] ?? 5) - (priorities[second.type] ?? 5);
    return priority || new Date(second.time) - new Date(first.time);
  };

  function getAll() {
    return [...queue].sort(compare);
  }

  return {
    getAll,
    push(entry) {
      queue.push(entry);
      queue.sort(compare);
      return queue.length;
    },
    clear() {
      queue.length = 0;
    },
  };
}

module.exports = { createEventFeedStore };
