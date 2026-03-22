import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://rbitomnwwzpgyiyvkvfq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiaXRvbW53d3pwZ3lpeXZrdmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDI0NTcsImV4cCI6MjA4OTY3ODQ1N30.arrsR_OQngJxz7BWLkZQUWmLovA7XPYYL0nCEN-tYQY";

const PLATFORM_COLORS = {
  "DraftKings": { bg: "#d6f0d6", border: "#b8ddb8", text: "#2d6a2d" },
  "FanDuel":    { bg: "#d0e8f8", border: "#b0d0ed", text: "#1a5280" },
  "Caesars":    { bg: "#eddfc4", border: "#d9c8a8", text: "#6b4c1e" },
  "Fanatics":   { bg: "#3a3a3a", border: "#2a2a2a", text: "#e0e0e0" },
  "BetMGM":     { bg: "#fde8cc", border: "#f0d0a8", text: "#7a3d00" },
};

const defaultColor = { bg: "#e8e8e8", border: "#cccccc", text: "#444444" };

const getPlatformColor = (sportsbook) => {
  if (!sportsbook) return defaultColor;
  const key = Object.keys(PLATFORM_COLORS).find(k =>
    sportsbook.toLowerCase().includes(k.toLowerCase())
  );
  return key ? PLATFORM_COLORS[key] : defaultColor;
};

const sb = {
  async get() {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bets?select=*&order=created_at.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  },
  async upsert(bet) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bets`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(bet)
    });
    if (!r.ok) throw new Error("Failed to save");
  },
  async delete(id) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bets?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!r.ok) throw new Error("Failed to delete");
  }
};

const fmt$ = n => {
  if (!n || n === 0) return "—";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function App() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("bets");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef();

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

  const handleDelete = async (id) => {
    try {
      await sb.delete(id);
      setBets(b => b.filter(x => x.id !== id));
      setConfirmDelete(null);
      setSuccessMsg("Bet deleted.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError("Failed to delete. Try again.");
    }
  };

  const processImage = useCallback(async (file) => {
    if (!file?.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setUploading(true); setError(null); setParseResult(null);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const resp = await fetch("/api/parse-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: file.type })
      });
      if (!resp.ok) throw new Error("Failed to parse image");
      const parsed = await resp.json();
      if (parsed.error) throw new Error(parsed.error);
      setParseResult(parsed);
    } catch (e) {
      setError(e.message || "Failed to parse. Try again.");
    } finally {
      setUploading(false);
    }
  }, []);

  const confirmAdd = async () => {
    if (!parseResult) return;
    setUploading(true);
    try {
      await sb.upsert(parseResult);
      await load();
      setParseResult(null);
      setSuccessMsg("Bet added!");
      setTimeout(() => setSuccessMsg(null), 3000);
      setTab("bets");
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const sorted = [...bets].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalPotential = bets.reduce((s, b) => s + (b.to_win || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#111827" }}>

      <div style={{ background: "#fff", borderBottom: "0.5px solid #e5e7eb", padding: "0 16px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, maxWidth: 600, margin: "0 auto" }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 15, color: "#111827" }}>🎰 Parlay Tracker</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{bets.length} bets · {fmt$(totalPotential)} potential</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setTab("bets"); setParseResult(null); setError(null); }} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 13, background: tab === "bets" ? "#f3f4f6" : "#fff", border: "0.5px solid #e5e7eb", color: "#374151", cursor: "pointer" }}>Bets</button>
            <button onClick={() => { setTab("add"); setParseResult(null); setError(null); }} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 13, background: "#111827", border: "none", color: "#fff", cursor: "pointer" }}>+ Add</button>
            <button onClick={load} style={{ padding: "7px 10px", borderRadius: 8, fontSize: 13, background: "#fff", border: "0.5px solid #e5e7eb", color: "#6b7280", cursor: "pointer" }}>↻</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "12px 12px 60px" }}>

        {successMsg && <div style={{ background: "#ecfdf5", border: "0.5px solid #6ee7b7", borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: "#065f46", fontSize: 13 }}>{successMsg}</div>}
        {error && <div style={{ background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: "#991b1b", fontSize: 13 }}>{error}</div>}

        {tab === "bets" && (
          loading
            ? <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Loading...</div>
            : bets.length === 0
              ? <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>No bets yet. Tap + Add to get started.</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sorted.map(bet => {
                    const c = getPlatformColor(bet.sportsbook);
                    const isDeleting = confirmDelete === bet.id;
                    return (
                      <div key={bet.id} style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e5e7eb", overflow: "hidden" }}>
                        <div style={{ background: c.bg, padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `0.5px solid ${c.border}` }}>
                          <span style={{ fontSize: 11, color: c.text, fontWeight: 500 }}>{bet.sportsbook} · {bet.date}</span>
                          {!isDeleting
                            ? <span onClick={() => setConfirmDelete(bet.id)} style={{ fontSize: 18, color: c.text, cursor: "pointer", lineHeight: 1, opacity: 0.6, padding: "0 2px" }}>×</span>
                            : <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span style={{ fontSize: 11, color: c.text, opacity: 0.8 }}>Delete?</span>
                                <button onClick={() => handleDelete(bet.id)} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, background: "#ef4444", border: "none", color: "#fff", cursor: "pointer" }}>Yes</button>
                                <button onClick={() => setConfirmDelete(null)} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, background: "rgba(0,0,0,0.1)", border: "none", color: c.text, cursor: "pointer" }}>No</button>
                              </div>
                          }
                        </div>
                        <div style={{ padding: "10px 14px" }}>
                          <div style={{ fontSize: 13, color: "#111827", lineHeight: 1.6, marginBottom: 10 }}>{bet.picks}</div>
                          <div style={{ display: "flex", borderTop: "0.5px solid #f3f4f6", paddingTop: 8 }}>
                            <div style={{ flex: 1, textAlign: "center" }}>
                              <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Wager</div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginTop: 2 }}>{bet.bonus_bet && bet.bonus_bet !== "No" ? bet.bonus_bet : fmt$(bet.wager)}</div>
                            </div>
                            <div style={{ width: "0.5px", background: "#f3f4f6" }} />
                            <div style={{ flex: 1, textAlign: "center" }}>
                              <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>To Win</div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginTop: 2 }}>{fmt$(bet.to_win)}</div>
                            </div>
                            <div style={{ width: "0.5px", background: "#f3f4f6" }} />
                            <div style={{ flex: 1, textAlign: "center" }}>
                              <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Odds</div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginTop: 2 }}>{bet.odds}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
        )}

        {tab === "add" && (
          <div>
            {!parseResult ? (
              <div>
                <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>Upload a screenshot of your bet receipt and we'll pull out all the details automatically.</p>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processImage(f); }}
                  onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${dragging ? "#6366f1" : "#d1d5db"}`, borderRadius: 12, padding: "48px 24px", textAlign: "center", cursor: uploading ? "wait" : "pointer", background: dragging ? "#eef2ff" : "#fff", transition: "all 0.15s" }}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && processImage(e.target.files[0])} />
                  {uploading
                    ? <div><div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div><div style={{ color: "#6b7280", fontSize: 14 }}>Parsing receipt...</div></div>
                    : <div><div style={{ fontSize: 40, marginBottom: 10 }}>📸</div><div style={{ color: "#111827", fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Drop screenshot here</div><div style={{ color: "#9ca3af", fontSize: 13 }}>or tap to browse</div></div>
                  }
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 16, color: "#065f46", fontSize: 14, fontWeight: 500 }}>✓ Parsed — confirm details below</div>
                <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
                  {[
                    ["Date", parseResult.date],
                    ["Sportsbook", parseResult.sportsbook],
                    ["Legs", parseResult.picks],
                    ["Wager", parseResult.bonus_bet && parseResult.bonus_bet !== "No" ? parseResult.bonus_bet : fmt$(parseResult.wager)],
                    ["To Win", fmt$(parseResult.to_win)],
                    ["Odds", parseResult.odds],
                    ["Bet ID", parseResult.bet_id || "—"],
                  ].map(([k, v], i, arr) => (
                    <div key={k} style={{ display: "flex", padding: "11px 16px", borderBottom: i < arr.length - 1 ? "0.5px solid #f3f4f6" : "none", gap: 16 }}>
                      <span style={{ width: 80, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0, paddingTop: 1 }}>{k}</span>
                      <span style={{ fontSize: 14, color: "#111827" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={confirmAdd} disabled={uploading} style={{ padding: "10px 24px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                    {uploading ? "Saving..." : "Add Bet"}
                  </button>
                  <button onClick={() => { setParseResult(null); setError(null); }} style={{ padding: "10px 20px", borderRadius: 8, background: "#fff", color: "#374151", border: "0.5px solid #e5e7eb", fontSize: 14, cursor: "pointer" }}>
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
