module.exports = function parseAffiliateEmail(body) {
  console.log("Parsing affiliate email...");

  const lower = body.toLowerCase();

  // Expanded affiliate network detection
  const networks = {
    maxbounty: "MaxBounty",
    partnerstack: "PartnerStack",
    swagbucks: "Swagbucks",
    acorns: "Acorns",
    rakuten: "Rakuten",
    sofi: "SoFi",
    honey: "PayPal Honey",
    paypal: "PayPal Honey",
    chime: "Chime",
    cashapp: "Cash App",
    "cash app": "Cash App",
    upside: "Upside",
    fetch: "Fetch Rewards",
    dosh: "Dosh",
    temu: "Temu Affiliate",
    amazon: "Amazon Shopper Panel",
    "shopper panel": "Amazon Shopper Panel"
  };

  let network = null;
  for (const key in networks) {
    if (lower.includes(key)) {
      network = networks[key];
      break;
    }
  }

  if (!network) {
    console.log("Unknown affiliate network.");
    return;
  }

  console.log(`Detected ${network} email.`);

  // Extract payout amounts
  const payoutRegex = /\$([0-9]+(?:\.[0-9]{2})?)/g;
  const payouts = [...body.matchAll(payoutRegex)].map(m => m[1]);

  // Extract all URLs
  const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
  const allUrls = [...body.matchAll(urlRegex)].map(m => m[1]);

  // Filter out useless URLs (images, fonts, css, tracking pixels)
  const filteredUrls = allUrls.filter(url => {
    return !url.match(/\.(png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|css|pdf)$/i)
        && !url.includes("googleusercontent")
        && !url.includes("doubleclick")
        && !url.includes("gstatic")
        && !url.includes("fonts")
        && !url.includes("pixel")
        && !url.includes("tracking");
  });

  // MaxBounty deep extraction
  let offerId = null;
  let campaignId = null;
  let creativeId = null;

  // Example: https://affiliates.maxbounty.com/campaign/27714
  const campaignRegex = /campaign\/([0-9]+)/i;
  const campaignMatch = body.match(campaignRegex);
  if (campaignMatch) campaignId = campaignMatch[1];

  // Example: ffatric3.com/trk/cdn/creative/lp?m=6119&o=33001&l=39131
  const offerRegex = /[?&]o=([0-9]+)/i;
  const offerMatch = body.match(offerRegex);
  if (offerMatch) offerId = offerMatch[1];

  const creativeRegex = /[?&]l=([0-9]+)/i;
  const creativeMatch = body.match(creativeRegex);
  if (creativeMatch) creativeId = creativeMatch[1];

  // Pick the most meaningful URL
  const affiliateLink = filteredUrls.length > 0 ? filteredUrls[0] : null;

  const event = {
    network,
    payouts,
    affiliateLink,
    offerId,
    campaignId,
    creativeId,
    timestamp: new Date().toISOString(),
    rawUrlCount: allUrls.length,
    filteredUrlCount: filteredUrls.length
  };

  console.log("Extracted affiliate event:");
  console.log(event);

  console.log(`AMO: Ingesting ${network} affiliate event...`);
};

// === AMO Ledger Sync Injection ===
const { appendLedgerRow } = require("./google-sheets.cjs");

appendLedgerRow([
  event.timestamp,
  event.network,
  "affiliate_event",
  event.payouts.join(","),
  event.affiliateLink,
  event.offerId || "",
  event.campaignId || "",
  event.creativeId || "",
  event.rawUrlCount,
  event.filteredUrlCount,
  "",
  "",
  "gmail",
  "ingested"
]);
