// Conceptual provider: real implementation must follow Twitter/X OAuth docs.

export const twitterProvider = {
  async login({ username }) {
    console.log('[TwitterProvider] login called for', username);

    // In reality: redirect-based OAuth, not raw password.
    // Here we simulate a session using env or placeholder.
    return {
      accessToken: process.env.TWITTER_BEARER_TOKEN || 'FAKE_TWITTER_TOKEN',
      refreshToken: null,
      expiresIn: null,
      meta: { username },
    };
  },

  async refresh(session) {
    console.log('[TwitterProvider] refresh called');
    return session;
  },
};
