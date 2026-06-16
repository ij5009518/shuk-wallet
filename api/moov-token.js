// Vercel serverless function: mints a short-lived Moov access token.
// Secret keys live only here (env vars), never in the browser.
export default async function handler(req, res) {
  const pub = process.env.MOOV_PUBLIC_KEY;
  const priv = process.env.MOOV_PRIVATE_KEY;
  const accountId = process.env.MOOV_ACCOUNT_ID;

  if (!pub || !priv || !accountId) {
    return res.status(200).json({ needsKeys: true });
  }

  const origin = req.headers.origin || `https://${req.headers.host || ""}`;
  const a = accountId;
  const scope = [
    "/accounts.write",
    `/accounts/${a}/profile.read`,
    `/accounts/${a}/profile.write`,
    `/accounts/${a}/cards.read`,
    `/accounts/${a}/cards.write`,
    `/accounts/${a}/bank-accounts.read`,
    `/accounts/${a}/bank-accounts.write`,
    `/accounts/${a}/capabilities.read`,
    `/accounts/${a}/capabilities.write`,
    `/accounts/${a}/representatives.read`,
    `/accounts/${a}/representatives.write`,
    `/accounts/${a}/files.read`,
    `/accounts/${a}/files.write`,
    `/accounts/${a}/issued-cards.read`,
    "/fed.read",
    "/profile-enrichment.read",
  ].join(" ");

  try {
    const r = await fetch("https://api.moov.io/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${pub}:${priv}`).toString("base64"),
        "Content-Type": "application/json",
        Origin: origin,
      },
      body: JSON.stringify({ grant_type: "client_credentials", scope }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: data || `status ${r.status}` });
    return res.status(200).json({ token: data.access_token, accountId });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
