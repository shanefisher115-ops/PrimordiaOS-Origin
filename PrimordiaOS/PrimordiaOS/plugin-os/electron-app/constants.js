// constants.js — IPC Nervous System Contract

module.exports = {
  IPC: {
    VIEW_SUBSCRIBE: 'view.subscribe',
    VIEW_ENGINE_CONTROL: 'view.engine.control',

    ENGINE_STATE: 'engine.state',
    ENGINE_CONTROL: 'engine.control',

    PHYSICS_APPLY_FORCE: 'physics.apply_force',
    PHYSICS_SET_VELOCITY: 'physics.set_velocity',
    PHYSICS_RESET: 'physics.reset',

    // NEW: kinetic feedback loop
    PRIORITY_UPDATE: 'priority.update'
  }
};
