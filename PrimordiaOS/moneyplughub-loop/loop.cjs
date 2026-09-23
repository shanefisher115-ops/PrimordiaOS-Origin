// loop.cjs
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const { PubSub } = require("@google-cloud/pubsub");

const secretClient = new SecretManagerServiceClient();
const pubsub = new PubSub();

// Load secrets once per cold start
async function getSecret(name) {
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/primordial-antigravity/secrets/${name}/versions/latest`,
  });
  return version.payload.data.toString();
}

// Main loop function
async function mphLoop(event, context) {
  console.log("[MoneyPlugHub] Loop tick:", new Date().toISOString());

  try {
    // Example: load API key from Secret Manager
    const apiKey = await getSecret("MONEYPLUGHUB_API_KEY");

    // Example: publish a heartbeat to Pub/Sub
    const topic = pubsub.topic("moneyplughub-events");
    const messageBuffer = Buffer.from(
      JSON.stringify({
        realm: "moneyplughub-loop",
        type: "heartbeat",
        data: { ok: true, apiKeyLoaded: !!apiKey },
      })
    );

    await topic.publish(messageBuffer);
    console.log("[MoneyPlugHub] Published heartbeat event");

    return "ok";
  } catch (err) {
    console.error("[MoneyPlugHub] Error in loop:", err.message);
    throw err;
  }
}

module.exports = { mphLoop };
