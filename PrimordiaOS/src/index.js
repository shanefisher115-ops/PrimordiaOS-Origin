export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();

    // Detect MaxBounty domains
    const isMaxBounty =
      hostname === "maxbounty.com" ||
      hostname === "www.maxbounty.com" ||
      hostname === "affiliate.maxbounty.com";

    // Silent skip if not MaxBounty
    if (!isMaxBounty) {
      return fetch(request);
    }

    // Detect offer ID
    let offerId = null;

    // Pattern: /offer/12345
    const offerMatch = url.pathname.match(/\/offer\/(\d+)/);
    if (offerMatch) {
      offerId = offerMatch[1];
    }

    // Pattern: ?offer=12345
    if (!offerId && url.searchParams.has("offer")) {
      offerId = url.searchParams.get("offer");
    }

    // Your affiliate ID
    const affiliateId = "799713";

    // If offer ID exists → build affiliate link
    if (offerId) {
      const injected = new URL("https://www.maxbounty.com/");
      injected.searchParams.set("affid", affiliateId);
      injected.searchParams.set("offer", offerId);

      // Fire AMO event (optional)
      const amoEvent = {
        event_type: "referral_injected",
        program: "maxbounty-offer",
        referral: affiliateId,
        url: injected.toString(),
        domain: hostname,
        offer_id: offerId,
        timestamp: new Date().toISOString(),
      };

      ctx.waitUntil(
        fetch("https://primordiaos-amo.your-domain.com/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(amoEvent),
        }).catch(() => {})
      );

      // Osmium ledger write (optional)
      const ledgerEntry = {
        type: "referral_injection",
        program: "maxbounty-offer",
        referral: affiliateId,
        domain: hostname,
        offer_id: offerId,
        timestamp: new Date().toISOString(),
      };

      ctx.waitUntil(
        fetch("https://primordiaos-osmium.your-domain.com/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ledgerEntry),
        }).catch(() => {})
      );

      // Redirect user to your affiliate link
      return Response.redirect(injected.toString(), 302);
    }

    // No offer ID → silent pass-through
    return fetch(request);
  },
};
