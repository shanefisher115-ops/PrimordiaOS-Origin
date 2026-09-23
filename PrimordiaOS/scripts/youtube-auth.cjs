require("dotenv").config();
const readline = require("readline");
const { google } = require("googleapis");

// Load credentials
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// ⭐ UPDATED SCOPES (YouTube Upload + Gmail Read)
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/gmail.readonly",
});

console.log("Visit this URL:");
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Paste the code here:\nCode: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log("SUCCESS! Your tokens:");
    console.log(tokens);
  } catch (err) {
    console.error("ERROR exchanging code:", err);
  }
  rl.close();
});
