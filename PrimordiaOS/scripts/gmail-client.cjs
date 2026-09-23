require("dotenv").config();
const { google } = require("googleapis");

// Load credentials
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

// OAuth client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

// Gmail API client
const gmail = google.gmail({ version: "v1", auth: oauth2Client });

module.exports = {
  gmail,

  async listMessages(query = "") {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 25,
    });
    return res.data.messages || [];
  },

  async getMessage(id) {
    const res = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });
    return res.data;
  },

  decodeBase64(data) {
    return Buffer.from(data, "base64").toString("utf8");
  },
};
