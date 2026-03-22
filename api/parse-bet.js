export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { image, mediaType } = req.body;
  if (!image || !mediaType) return res.status(400).json({ error: "Missing image data" });

  const safeMediaType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType)
    ? mediaType
    : "image/jpeg";

  let anthropicResponse, anthropicData, text;

  try {
    anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `Parse a sports bet receipt screenshot and return ONLY a JSON object with these exact fields, no markdown, no explanation, just raw JSON:
{"date":"M/D/YYYY","type":"X-Pick Parlay","picks":"all picks","events":"event names","odds":"+XXXX","wager":0,"bonus_bet":"Yes - $50 or No","to_win":0,"result":"Pending","bet_id":"","sportsbook":"DraftKings","notes":""}`,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: safeMediaType, data: image } },
            { type: "text", text: "Parse this bet receipt into JSON only." }
          ]
        }]
      })
    });

    anthropicData = await anthropicResponse.json();
    console.log("Anthropic status:", anthropicResponse.status);
    console.log("Anthropic response:", JSON.stringify(anthropicData).slice(0, 500));

    if (!anthropicResponse.ok) {
      return res.status(500).json({ error: `Anthropic API error: ${anthropicData.error?.message || anthropicResponse.status}` });
    }

    text = anthropicData.content?.map(c => c.text || "").join("") || "";
    console.log("Extracted text:", text.slice(0, 300));

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.log("No JSON found in response:", text);
      return res.status(422).json({ error: "Could not find JSON in AI response", raw: text.slice(0, 200) });
    }

    const parsed = JSON.parse(match[0]);
    parsed.id = "bet_" + Date.now();
    parsed.payout = null;
    return res.status(200).json(parsed);

  } catch (e) {
    console.log("Error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
