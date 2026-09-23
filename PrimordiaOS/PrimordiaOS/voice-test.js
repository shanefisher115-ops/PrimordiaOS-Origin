// voice-test.cjs
const record = require("node-record-lpcm16");

const opts = {
  sampleRate: 16000,
  channels: 1,
  threshold: 0,
  verbose: true,
  recordProgram: "windows"   // <<-- force Windows backend
};

const mic = record.record(opts);

mic.stream()
  .on("data", chunk => {
    console.log("Audio chunk:", chunk.length);
  })
  .on("error", err => {
    console.error("[MIC STREAM ERROR]", err);
  });

// catch unhandled rejections / exceptions so process doesn't crash
process.on("unhandledRejection", err => {
  console.error("[UNHANDLED REJECTION]", err);
});
process.on("uncaughtException", err => {
  console.error("[UNCAUGHT EXCEPTION]", err);
});
