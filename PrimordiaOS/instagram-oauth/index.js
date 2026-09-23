export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/instagram/login") {
      const state = crypto.randomUUID();

      const authorizeURL = new URL("https://www.instagram.com/oauth/authorize");
      authorizeURL.searchParams.set("client_id", env.INSTAGRAM_APP_ID);
      authorizeURL.searchParams.set(
        "redirect_uri",
        "https://primordialorigin.com/instagram/callback"
      );
      authorizeURL.searchParams.set("response_type", "code");
      authorizeURL.searchParams.set(
        "scope",
        "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish"
      );
      authorizeURL.searchParams.set("state", state);

      return Response.redirect(authorizeURL.toString(), 302);
    }

    if (url.pathname === "/instagram/callback") {
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        return new Response("User denied authorization.", { status: 400 });
      }

      const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: env.INSTAGRAM_APP_ID,
          client_secret: env.INSTAGRAM_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: "https://primordialorigin.com/instagram/callback",
          code,
        }),
      });

      const tokenData = await tokenRes.json();

      return new Response(JSON.stringify(tokenData, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
