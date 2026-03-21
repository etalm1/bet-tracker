import { useState, useEffect } from "react";

const SUPABASE_URL = "https://rbitomnwwzpgyiyvkvfq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiaXRvbW53d3pwZ3lpeXZrdmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDI0NTcsImV4cCI6MjA4OTY3ODQ1N30.arrsR_OQngJxz7BWLkZQUWmLovA7XPYYL0nCEN-tYQY";

const sb = {
  async get() {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bets?select=*&order=created_at.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  },
  async update(id, fields) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bets?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(fields)
    });
    if (!r.ok) throw new Error("Failed to update");
  }
};

const RC = {
  Win:     { bg: "#0a2e0a", border: "#22c55e", badge: "#16a34a", text: "#4ade80" },
  Loss:    { bg: "#2e0a0a", border: "#ef4444", badge: "#dc2626", text: "#f87171" },
  Pending: { bg: "#1a1a0a", border: "#eab308", badge: "#ca8a04", text: "#facc15" },
};

const fmt$ = n => (n == null || n === "") ? "—" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function App() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sb.get();
      setBets(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not connect to database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateResult = async (id, result) => {
    setBets(b => b.map(x => x.id === id ? { ...x, result } : x));
    try {
      await sb.update(id, { result });
      setSuccessMsg("Result updated!");
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch {
      setError("Failed to save. Try again.");
    }
  };

  const sorted = [...bets].sort((a, b) => new Date(b.date) - new Date(a.date));
  const potential = bets.reduce((s, b) => s + (b.result === "Pending" ? (b.to_win || 0) : 0), 0);
  const wins = bets.filter(b => b.result === "Win").length;
  const losses = bets.filter(b => b.result === "Loss").length;
  const pending = bets.filter(b => b.result === "Pending").length;
  const pnl = bets.reduce((s, b) => {
    if (b.result === "Win") return s + (b.payout || b.to_win || 0) - (b.wager || 0);
    if (b.result === "Loss") return s - (b.wager || 0);
    return s;
  }, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#e8e0d0", fontFamily: "Georgia, serif" }}>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 20% 0%, #0d2b0d, transparent 50%), radial-gradient(ellipse at 80% 100%, #1a0a00, transparent 50%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>

        <div style={{ textAlign: "center", padding: "40px 0 24px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: "#5a7a4a", textTransform: "uppercase", marginBottom: 8 }}>Private Syndicate · Live</div>
          <h1 style={{ fontSize: "clamp(28px,6vw,48px)", fontWeight: 400, margin: 0, color: "#f0e8d0", textShadow: "0 0 40px rgba(100,180,80,0.2)", letterSpacing: "0.05em" }}>🏆 The Book</h1>
          <div style={{ fontSize: 12, color: "#4a6a3a", marginTop: 6, letterSpacing: "0.15em" }}>PARLAY & FUTURES TRACKER</div>
          <div style={{ fontSize: 11, color: "#3a5a2a", marginTop: 4 }}>To add bets, send screenshots in the Claude chat</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 28 }}>
          {[
            ["Potential", fmt$(potential), "#facc15"],
            ["Record", `${wins}W – ${losses}L`, "#e8e0d0"],
            ["Pending", pending, "#60a5fa"],
            ["P&L", fmt$(pnl), pnl >= 0 ? "#4ade80" : "#f87171"],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 8px", textAlign: "center" }}>
              <div style={{ fontSize: "clamp(11px,2.5vw,20px)", fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
              <div style={{ fontSize: 10, color: "#5a6a4a", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 12, alignItems: "center" }}>
          {successMsg && <span style={{ color: "#4ade80", fontSize: 13 }}>{successMsg}</span>}
          {error && <span style={{ color: "#f87171", fontSize: 13 }}>{error}</span>}
          <button onClick={load} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "#7a9a6a", fontFamily: "Georgia,serif", letterSpacing: "0.08em" }}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#5a7a4a", fontSize: 16 }}>⏳ Loading from database...</div>
        ) : bets.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#5a7a4a", fontSize: 14 }}>No bets found. Send screenshots in the Claude chat to add bets.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sorted.map(bet => {
              const rc = RC[bet.result] || RC.Pending;
              return (
                <div key={bet.id} style={{ background: rc.bg, border: `1px solid ${rc.border}33`, borderLeft: `3px solid ${rc.border}`, borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        <span style={{ background: rc.badge, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.1em" }}>{bet.result}</span>
                        <span style={{ color: "#6a8a5a", fontSize: 12 }}>{bet.date}</span>
                        <span style={{ color: "#8a9a7a", fontSize: 12 }}>{bet.type}</span>
                        {bet.bonus_bet && bet.bonus_bet !== "No" && (
                          <span style={{ background: "rgba(234,179,8,0.15)", border: "1px solid #ca8a04", color: "#facc15", fontSize: 10, padding: "2px 8px", borderRadius: 20 }}>BONUS BET</span>
                        )}
                      </div>
                      <div style={{ fontSize: 14, color: "#d0c8b0", marginBottom: 6, lineHeight: 1.5 }}>{bet.picks}</div>
                      <div style={{ fontSize: 12, color: "#5a7a4a" }}>{bet.events}</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 100 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: rc.text, fontFamily: "monospace" }}>{bet.odds}</div>
                      <div style={{ fontSize: 13, color: "#a0b890", marginTop: 2 }}>To Win: {fmt$(bet.to_win)}</div>
                      <div style={{ fontSize: 12, color: "#6a8a5a" }}>Wager: {!bet.wager ? "Bonus" : fmt$(bet.wager)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#5a6a4a", textTransform: "uppercase", letterSpacing: "0.1em" }}>Mark:</span>
                    {["Pending", "Win", "Loss"].map(r => (
                      <button key={r} onClick={() => updateResult(bet.id, r)} style={{
                        padding: "5px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                        border: bet.result === r ? `1px solid ${RC[r].border}` : "1px solid rgba(255,255,255,0.1)",
                        background: bet.result === r ? `${RC[r].badge}33` : "transparent",
                        color: bet.result === r ? RC[r].text : "#6a7a5a",
                        letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Georgia,serif",
                      }}>{r}</button>
                    ))}
                    {bet.notes && <span style={{ fontSize: 11, color: "#4a5a3a", marginLeft: "auto", fontStyle: "italic" }}>{bet.notes}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
