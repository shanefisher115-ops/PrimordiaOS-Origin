Write-Host '=== PrimordiaOS AMO Ledger Sync Installer ===' -ForegroundColor Cyan

$root    = 'C:\Users\Shane\documents\dev\primordiaos'
$scripts = "$root\scripts"
$envFile = "$root\.env"
$gsheets = "$scripts\google-sheets.cjs"
$parser  = "$scripts\gmail-parse.cjs"

# 1) google-sheets.cjs
Write-Host ''
Write-Host '[1] Creating google-sheets.cjs...' -ForegroundColor Yellow

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
    requestBody: {
      values: [row]
    }
  });

  console.log("AMO Ledger updated.");
}

module.exports = { appendLedgerRow };
'@

Set-Content -Path $gsheets -Value $gsheetsContent -Encoding UTF8
Write-Host '✔ google-sheets.cjs created.' -ForegroundColor Green

# 2) Inject AMO Ledger Sync into gmail-parse.cjs (inside function)
Write-Host ''
Write-Host '[2] Injecting AMO Ledger Sync into gmail-parse.cjs...' -ForegroundColor Yellow

$parserContent = Get-Content -Path $parser -Raw

$marker = 'console.log("Extracted affiliate event:");'
$marker2 = 'console.log(event);'

$injectBlock = @'
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
'@

$search = "$marker`n  $marker2"
$replace = "$marker`n  $marker2`n`n  $injectBlock"

if ($parserContent -like "*$search*") {
    $parserContent = $parserContent -replace [regex]::Escape($search), [regex]::Escape($replace).Replace('\`n',"`n")
    Set-Content -Path $parser -Value $parserContent -Encoding UTF8
    Write-Host '✔ AMO Ledger Sync injected after console.log(event);' -ForegroundColor Green
} else {
    Write-Host '⚠ Could not find console.log block to inject into.' -ForegroundColor Red
}

# 3) Update .env
Write-Host ''
Write-Host '[3] Updating .env...' -ForegroundColor Yellow

$envAdd = @'
# AMO Ledger Sync
AMO_SHEETS_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
'@

Add-Content -Path $envFile -Value "`n$envAdd"
Write-Host '✔ .env updated.' -ForegroundColor Green

Write-Host ''
Write-Host '=== AMO Ledger Sync Installation Complete ===' -ForegroundColor Cyan
Write-Host 'Add your Sheets ID + Google OAuth client credentials to .env' -ForegroundColor Magenta
Write-Host 'Then run: node scripts/gmail-read.cjs' -ForegroundColor Magenta
