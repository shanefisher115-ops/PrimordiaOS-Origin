export const redditProvider = {
  async login({ username }) {
    console.log('[RedditProvider] login called for', username);

    return {
      accessToken: 'FAKE_REDDIT_TOKEN',
      refreshToken: null,
      expiresIn: null,
      meta: { username },
    };
  },

  async refresh(session) {
    console.log('[RedditProvider] refresh called');
    return session;
  },
};
