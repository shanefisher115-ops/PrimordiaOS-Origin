export const LoopConfig = {
  maxDepth: 50,
  allowTesting: true,
  allowBoosting: true,
  allowPausing: true,

  verticalOverrides: {
    crypto: { allowBoosting: false },
    sweepstakes: { allowTesting: false },
  },
};
