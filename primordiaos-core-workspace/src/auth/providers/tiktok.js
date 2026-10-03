export const tiktokProvider = {
  async login({ username }) {
    console.log('[TikTokProvider] login called for', username);

    return {
      accessToken: process.env.TIKTOK_ACCESS_TOKEN || 'FAKE_TIKTOK_TOKEN',
      refreshToken: null,
      expiresIn: null,
      meta: { username },
    };
  },

  async refresh(session) {
    console.log('[TikTokProvider] refresh called');
    return session;
  },
};
