import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

app.post("/api/browser/context", (req, res) => {
  const context = req.body;

  const nextAction = {
    action: "LOAD_SKILL",
    skill: "browser-insight",
    reason: "Context received from PrimordiaOS",
    metadata: context
  };

  res.json({ status: "RECEIVED", context, nextAction });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Primordia Cloud Run API on ${port}`);
});

// Root route
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "PrimordiaOS Cloud Run API is alive." });
});

// Browser context route with feedback loop
app.post("/api/browser/context", (req, res) => {
  const context = req.body;

  // Cloud → OS decision logic
  const nextAction = {
    action: "LOAD_SKILL",
    skill: "browser-insight",
    reason: "Context received from PrimordiaOS",
    metadata: context
  };

  res.json({
    status: "RECEIVED",
    context,
    nextAction
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`PrimordiaOS Cloud Run API running on port ${port}`);
});
