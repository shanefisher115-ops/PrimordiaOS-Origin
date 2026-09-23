require("dotenv").config();
const { google } = require("googleapis");
const readline = require("readline");

// Load your credentials from .env
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];

// Generate the Google OAuth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("Visit this URL:");
console.log(authUrl);

// Ask user for the code
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Paste the code here:\nCode: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log("\nSUCCESS! Your tokens:");
    console.log(tokens);
  } catch (err) {
    console.error("\nERROR exchanging code:");
    console.error(err);
  }
  rl.close();
});
