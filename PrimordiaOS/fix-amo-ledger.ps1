Write-Host '=== PrimordiaOS AMO Ledger Sync — Full Repair ===' -ForegroundColor Cyan

$root    = 'C:\Users\Shane\documents\dev\primordiaos'
$scripts = "$root\scripts"
$envFile = "$root\.env"
$parser  = "$scripts\gmail-parse.cjs"
$backup  = "$scripts\gmail-parse.backup.cjs"
$gsheets = "$scripts\google-sheets.cjs"

Write-Host ''
Write-Host '[1] Backing up gmail-parse.cjs...' -ForegroundColor Yellow
Copy-Item $parser $backup -Force
Write-Host '✔ Backup created.' -ForegroundColor Green

Write-Host ''
Write-Host '[2] Rebuilding gmail-parse.cjs cleanly...' -ForegroundColor Yellow

$parserContent = @'
const { google } = require("googleapis");
const cheerio = require("cheerio");
require("dotenv").config();

function parseAffiliateEmail(html, network) {
  const $ = cheerio.load(html);

  const allUrls = [];
  $("a").each((i, el) => {
    const href = $(el).attr("href");
    if (href) allUrls.push(href);
  });

  const filteredUrls = allUrls.filter(u =>
    u.includes("maxbounty") ||
    u.includes("swagbucks") ||
    u.includes("rakuten") ||
    u.includes("acorns") ||
    u.includes("honey") ||
    u.includes("sofi")
  );

  const payouts = [];
  $("body").text().split(/\s+/).forEach(word => {
    if (word.startsWith("$")) payouts.push(word);
  });

  const offerId = filteredUrls[0]?.match(/offerID=(\d+)/)?.[1] || "";
  const campaignId = filteredUrls[0]?.match(/campaignID=(\d+)/)?.[1] || "";
  const creativeId = filteredUrls[0]?.match(/creativeID=(\d+)/)?.[1] || "";

  const event = {
    network,
    payouts,
    affiliateLink: filteredUrls[0] || "",
    offerId,
    campaignId,
    creativeId,
    timestamp: new Date().toISOString(),
    rawUrlCount: allUrls.length,
    filteredUrlCount: filteredUrls.length
  };

  console.log("Extracted affiliate event:");
  console.log(event);

  // === AMO Ledger Sync Injection ===
  const { appendLedgerRow } = require("./google-sheets.cjs");
  appendLedgerRow([
    event.timestamp,
    event.network,
    "affiliate_event",
    event.payouts.join(","),
    event.affiliateLink,
    event.offerId,
    event.campaignId,
    event.creativeId,
    event.rawUrlCount,
    event.filteredUrlCount,
    "",
    "",
    "gmail",
    "ingested"
  ]);

  console.log(`AMO: Ingesting ${network} affiliate event...`);
  return event;
}

module.exports = { parseAffiliateEmail };
'@

Set-Content -Path $parser -Value $parserContent -Encoding UTF8
Write-Host '✔ gmail-parse.cjs rebuilt.' -ForegroundColor Green

Write-Host ''
Write-Host '[3] Creating google-sheets.cjs...' -ForegroundColor Yellow

$gsheetsContent = @'
const { google } = require("googleapis");
require("dotenv").config();

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}

async function appendLedgerRow(row) {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.AMO_SHEETS_ID;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "AMO_Ledger!A:Z",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] }
  });

  console.log("AMO Ledger updated.");
}

module.exports = { appendLedgerRow };
'@

Set-Content -Path $gsheets -Value $gsheetsContent -Encoding UTF8
Write-Host '✔ google-sheets.cjs created.' -ForegroundColor Green

Write-Host ''
Write-Host '[4] Updating .env...' -ForegroundColor Yellow

$envAdd = @'
# AMO Ledger Sync
AMO_SHEETS_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
'@

Add-Content -Path $envFile -Value "`n$envAdd"
Write-Host '✔ .env updated.' -ForegroundColor Green

Write-Host ''
Write-Host '=== AMO Ledger Sync Repair Complete ===' -ForegroundColor Cyan
Write-Host 'Fill in your Sheets + OAuth credentials, then run:' -ForegroundColor Magenta
Write-Host 'node scripts/gmail-read.cjs' -ForegroundColor Magenta
