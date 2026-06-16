// Vercel serverless function: mints a short-lived Moov access token.
// Secret keys live only here (env vars), never in the browser.
// Pass { accountId } in the body to also scope to a newly-onboarded account.
export default async function handler(req, res) {
  const pub = process.env.MOOV_PUBLIC_KEY;
  const priv = process.env.MOOV_PRIVATE_KEY;
  const facilitator = process.env.MOOV_ACCOUNT_ID;

  if (!pub || !priv || !facilitator) {
    return res.status(200).json({ needsKeys: true });
  }

  let body = {};
  try { body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}"); } catch {}
  const target = body && body.accountId;

  const fullFor = (a) =>
    ["bank-accounts", "capabilities", "cards", "profile", "representatives", "files"]
      .flatMap((x) => [`/accounts/${a}/${x}.read`, `/accounts/${a}/${x}.write`])
      .concat([`/accounts/${a}/issued-cards.read`]);

  let scopes = ["/accounts.write", "/fed.read", "/profile-enrichment.read"].concat(fullFor(facilitator));
  if (target && target !== facilitator) scopes = scopes.concat(fullFor(target));

  const origin = req.headers.origin || `https://${req.headers.host || ""}`;
  try {
    const r = await fetch("https://api.moov.io/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${pub}:${priv}`).toString("base64"),
        "Content-Type": "application/json",
        Origin: origin,
      },
      body: JSON.stringify({ grant_type: "client_credentials", scope: scopes.join(" ") }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: data || `status ${r.status}` });
    return res.status(200).json({ token: data.access_token, accountId: facilitator });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
