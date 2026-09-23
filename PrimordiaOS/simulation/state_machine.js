'use strict';

module.exports = function StateMachine(bus, logger) {
  logger.info('[STATE-MACHINE] Loaded');

  let state = 'idle';

  function transition(next) {
    const prev = state;
    state = next;

    bus.emitEvent('simulation.state.changed', { prev, next });
    logger.info({ prev, next }, '[STATE-MACHINE] Transition');
  }

  function getState() {
    return state;
  }

  return { transition, getState };
};
