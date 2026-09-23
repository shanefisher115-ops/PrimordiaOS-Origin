import { handleReferralIntake } from "../gateway.mjs";

describe("Primordia Referral Gateway", () => {
  beforeEach(() => {
    global.moneyplug = {
      reward: jest.fn().mockResolvedValue(true),
      ledger: { log: jest.fn().mockResolvedValue(true) },
    };
    global.pluginOS = {
      xp: { increment: jest.fn().mockResolvedValue(true) },
      identity: { setClass: jest.fn().mockResolvedValue(true) },
    };
    global.insidersCircle = {
      assignQuest: jest.fn().mockResolvedValue(true),
      ensureReferralLink: jest.fn().mockResolvedValue(true),
    };
    global.primordiaFlow = {
      log: jest.fn().mockResolvedValue(true),
    };
    global.primordiaSwarm = {
      broadcast: jest.fn().mockResolvedValue(true),
    };
  });

  it("processes a valid referral intake", async () => {
    const rawBody = JSON.stringify({
      offerId: "navigator-offer",
      clickId: "abc123",
      payout: 25.0,
      timestamp: Date.now(),
      userId: "user-001",
    });

    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha256", "test-secret");
    hmac.update(rawBody);
    const signature = hmac.digest("hex");

    const result = await handleReferralIntake({
      rawBody,
      parsedBody: {
        offerId: "navigator-offer",
        clickId: "abc123",
        payout: 25.0,
        timestamp: Date.now(),
        userId: "user-001",
        signature,
      },
    });

    expect(result.status).toBe("ok");
    expect(result.identityClass).toBe("Navigator");
  });
});
