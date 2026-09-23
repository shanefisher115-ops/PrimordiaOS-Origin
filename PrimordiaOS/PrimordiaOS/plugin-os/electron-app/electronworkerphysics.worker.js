const { parentPort } = require('worker_threads');
const { IPC } = require('../../shared/constants.js');

const bodies = {
  CAD_FILE_A: { x: 0, y: 0, vx: 0, vy: 0 }
};

function step(dt) {
  for (const id in bodies) {
    const b = bodies[id];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }

  parentPort.postMessage({
    ts: Date.now(),
    objects: JSON.parse(JSON.stringify(bodies))
  });
}

parentPort.on('message', (msg) => {
  if (msg.type === IPC.PHYSICS_FORCE) {
    const { id, fx, fy } = msg.payload;
    const b = bodies[id];
    if (b) {
      b.vx += fx;
      b.vy += fy;
    }
  }
});

let last = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - last) / 16.67;
  last = now;
  step(dt);
}, 16);
