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
