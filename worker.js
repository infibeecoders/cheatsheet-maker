// Cloudflare Worker: keeps your Anthropic API key secret.
// Set secrets/vars in Cloudflare: ANTHROPIC_API_KEY (secret) and ALLOWED_ORIGIN (e.g. https://yourname.github.io)
export default {
  async fetch(req, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
    if (origin !== "*" && req.headers.get("Origin") !== origin)
      return new Response("Forbidden", { status: 403, headers: cors });
    let prompt = "";
    try { prompt = (await req.json()).prompt || ""; } catch (e) {}
    if (!prompt || prompt.length > 6000)
      return new Response("Bad request", { status: 400, headers: cors });
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) return new Response("Upstream error " + r.status, { status: 502, headers: cors });
    const j = await r.json();
    const text = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("");
    return new Response(JSON.stringify({ text }), { headers: { ...cors, "Content-Type": "application/json" } });
  },
};
