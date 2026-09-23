import express from "express";

const app = express();
const port = 4000;

app.get("/engine/status", (_, res) => {
  res.json({
    linked: true,
    tickRate: 60,
    objects: [
      { id: "satellite-01", position: [0, 0, 0], velocity: [0, 1, 0] },
      { id: "probe-02", position: [10, 5, -3], velocity: [0.2, 0.1, 0] }
    ]
  });
});

app.listen(port, () => {
  console.log(`PrimordiaOS engine-core running on port ${port}`);
});
