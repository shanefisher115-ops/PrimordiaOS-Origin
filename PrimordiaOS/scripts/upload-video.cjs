require("dotenv").config();
const fs = require("fs");
const { google } = require("googleapis");

// Load credentials
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

const youtube = google.youtube({
  version: "v3",
  auth: oauth2Client,
});

async function uploadVideo({
  filePath,
  title,
  description,
  tags = [],
  privacy = "public",
}) {
  try {
    console.log("Uploading video:", title);

    const res = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title,
          description,
          tags,
        },
        status: {
          privacyStatus: privacy,
        },
      },
      media: {
        body: fs.createReadStream(filePath),
      },
    });

    console.log("COMPLETE!");
    console.log("Video ID:", res.data.id);
    console.log("Watch URL: https://www.youtube.com/watch?v=" + res.data.id);
  } catch (err) {
    console.error("UPLOAD FAILED:");
    console.error(err);
  }
}

// ⭐ Your real video path
uploadVideo({
  filePath: "C:/Users/Shane/Downloads/How Plug In OS Automates Earnings.mp4",
  title: "How Plug In OS Automates Earnings",
  description: "Uploaded automatically via PrimordiaOS + Google API",
  tags: ["primordiaos", "plug in os", "automation", "amo", "money systems"],
  privacy: "public",
});
