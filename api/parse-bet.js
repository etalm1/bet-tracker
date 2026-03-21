export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { image, mediaType } = req.body;
  if (!image || !mediaType) return res.status(400).json({ error: "Missing image data" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `Parse a sports bet receipt screenshot and return ONLY a JSON object with these fields:
{ "date":"M/D/YYYY", "type":"X-Pick Parlay or Future", "picks":"all picks described concisely", "events":"event names", "odds":"+XXXX", "wager":number (0 if bonus bet), "bonus_bet":"Yes – $XX or No", "to_win":number, "result":"Pending", "bet_id":"string or empty string", "sportsbook":"name", "notes":"any important notes" }
Return ONLY raw JSON, no markdown, no explanation.`,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: "Parse this bet receipt." }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.map(c => c.text || "").join("") || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: "Could not parse bet details" });

    const parsed = JSON.parse(match[0]);
    parsed.id = "bet_" + Date.now();
    parsed.payout = null;
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
