export default {
  roots: [
    "<rootDir>/primordia-referral-gate",
    "<rootDir>/test"
  ],

  testMatch: [
    "<rootDir>/primordia-referral-gate/test/**/*.spec.mjs",
    "<rootDir>/test/**/*.spec.js"
  ],

  modulePathIgnorePatterns: [
    "<rootDir>/archive",
    "<rootDir>/\\.gemini",
    "<rootDir>/\\.agents",
    "<rootDir>/_quarantine_dotfiles"
  ],

  forceExit: true
};
