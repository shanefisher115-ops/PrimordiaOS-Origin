export const instagramProvider = {
  async login({ username }) {
    console.log('[InstagramProvider] login called for', username);

    return {
      accessToken: process.env.IG_ACCESS_TOKEN || 'FAKE_IG_TOKEN',
      refreshToken: null,
      expiresIn: null,
      meta: { username },
    };
  },

  async refresh(session) {
    console.log('[InstagramProvider] refresh called');
    return session;
  },
};
