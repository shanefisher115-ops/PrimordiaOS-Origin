let cockpitState = {
  panels: {
    eventBus: []
  }
};

export function addEvent(event) {
  cockpitState.panels.eventBus.push(event);
}

export function getState() {
  return cockpitState;
}
