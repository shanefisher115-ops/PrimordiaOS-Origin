// primordia-referral-gate/gateway.mjs

import crypto from "crypto";

// TODO: move to config/env
const MAXBOUNTY_WEBHOOK_SECRET = process.env.MAXBOUNTY_WEBHOOK_SECRET;

function verifySignature(rawBody, signature) {
  const hmac = crypto.createHmac("sha256", MAXBOUNTY_WEBHOOK_SECRET);
  hmac.update(rawBody);
  const expected = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function mapOfferToIdentityClass(offerId) {
  // Simple starter mapping – refine later
  const map = {
    "builder-offer": "Builder",
    "operator-offer": "Operator",
    "navigator-offer": "Navigator",
    "charger-offer": "Charger",
    "expander-offer": "Expander",
    "observer-offer": "Observer",
  };
  return map[offerId] || "Observer";
}

export async function handleReferralIntake({ rawBody, parsedBody }) {
  const { signature } = parsedBody;

  if (!verifySignature(rawBody, signature)) {
    throw new Error("Invalid webhook signature");
  }

  const {
    offerId,
    clickId,
    payout,
    timestamp,
    userId, // you’ll map this from clickId → user in your tracking layer
  } = parsedBody;

  const identityClass = mapOfferToIdentityClass(offerId);

  // ---- MoneyPlugHub: reward + ledger ----
  await global.moneyplug.reward(userId, payout);
  await global.moneyplug.ledger.log({
    type: "affiliate_conversion",
    userId,
    offerId,
    payout,
    timestamp,
  });

  // ---- Plug-In OS: XP loop ----
  await global.pluginOS.xp.increment(userId, 250);
  await global.pluginOS.identity.setClass(userId, identityClass);

  // ---- Insiders Circle: quest + referral loop ----
  await global.insidersCircle.assignQuest(userId, "share-referral-link");
  await global.insidersCircle.ensureReferralLink(userId);

  // ---- Primordia Flow: event log ----
  await global.primordiaFlow.log("referral_conversion", {
    userId,
    offerId,
    payout,
    identityClass,
    timestamp,
  });

  // ---- Primordia Swarm: notify agents ----
  await global.primordiaSwarm.broadcast("conversion", {
    userId,
    offerId,
    payout,
    identityClass,
  });

  return {
    status: "ok",
    identityClass,
    payout,
  };
}
