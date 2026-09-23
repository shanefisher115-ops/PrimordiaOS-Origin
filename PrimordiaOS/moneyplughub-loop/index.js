// index.js
exports.mphLoop = async (event, context) => {
  console.log("[MoneyPlugHub] tick:", new Date().toISOString());
  return "ok";
};
