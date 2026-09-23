// src/live/agents/posting.ts

import {
  instagramPostingAgent,
  shortsPostingAgent,
  facebookPostingAgent,
  xPostingAgent,
  redditPostingAgent,
  linkedinPostingAgent
} from "./posting-multi"

import { youtubePostingAgent, tiktokPostingAgent } from "./posting"

export async function dispatchPost(payload) {
  switch (payload.platform) {
    case "youtube":
      return youtubePostingAgent(payload)

    case "tiktok":
      return tiktokPostingAgent(payload)

    case "instagram":
      return instagramPostingAgent(payload)

    case "shorts":
      return shortsPostingAgent(payload)

    case "facebook":
      return facebookPostingAgent(payload)

    case "x":
      return xPostingAgent(payload)

    case "reddit":
      return redditPostingAgent(payload)

    case "linkedin":
      return linkedinPostingAgent(payload)

    default:
      return {
        status: "error",
        platform: payload.platform,
        message: "Unsupported platform"
      }
  }
}
