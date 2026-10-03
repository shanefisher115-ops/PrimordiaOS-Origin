export const youtubeProvider = {
  async login({ username }) {
    console.log('[YouTubeProvider] login called for', username);

    return {
      accessToken: process.env.YOUTUBE_ACCESS_TOKEN || 'FAKE_YOUTUBE_TOKEN',
      refreshToken: null,
      expiresIn: null,
      meta: { username },
    };
  },

  async refresh(session) {
    console.log('[YouTubeProvider] refresh called');
    return session;
  },
};
