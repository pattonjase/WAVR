import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Check, X, Music2, Trophy, ArrowLeft, Zap, Image as ImageIcon, Upload, Type, Sparkles, LogOut, Mail, Lock, User as UserIcon } from "lucide-react";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap";

// ============================================
// SUPABASE CONFIG — fill these in with your own project's values
// (Project Settings -> API in your Supabase dashboard)
// ============================================
const SUPABASE_URL = "https://gpjlrpuwrkompzkqirqk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MLrO_hKcHnmIUNRB9sPtow_GRWoymSJ";

const isConfigured = !SUPABASE_URL.includes("YOUR_PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR_ANON");

async function sb(path, { method = "GET", body, token, headers = {} } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    const msg = (data && (data.msg || data.message || data.error_description)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function uploadBattlePhoto(file, userId, token) {
  const ext = (file.name && file.name.split(".").pop()) || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/battle-photos/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  });
  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try { const d = await res.json(); msg = d.message || msg; } catch (e) {}
    throw new Error(msg);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/battle-photos/${path}`;
}

const PRESET_PROMPTS = [
  "Perfect song for a car chase",
  "Song that instantly kills a party",
  "Best song to walk into a boss battle",
  "Song for a redneck wedding first dance",
  "Funeral song that isn't sad",
  "Song to play when you're about to get fired",
  "Best song for a breakup you caused",
  "Song for the villain's entrance",
];

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg,#FF3D7A,#FFD23F)",
  "linear-gradient(135deg,#3DDC97,#2D6BFF)",
  "linear-gradient(135deg,#FFD23F,#FF3D7A)",
  "linear-gradient(135deg,#8A5CFF,#FF3D7A)",
];

function transformBattle(row, myUserId) {
  const votes = row.votes || [];
  const mine = votes.find((v) => v.voter_id === myUserId);
  return {
    id: row.id,
    prompt: row.prompt_text || "",
    promptImage: row.prompt_image_url || null,
    songA: { title: row.song_a_title, artist: row.song_a_artist, art: row.song_a_art_url, grad: 0 },
    songB: { title: row.song_b_title, artist: row.song_b_artist, art: row.song_b_art_url, grad: 1 },
    votesA: votes.filter((v) => v.side === "a").length,
    votesB: votes.filter((v) => v.side === "b").length,
    voted: mine ? mine.side : null,
  };
}

function WavrMark({ size = 22 }) {
  const bars = [
    { x: 63, y: 203.5, h: 105 },
    { x: 99, y: 158.5, h: 195 },
    { x: 135, y: 113.5, h: 285 },
    { x: 171, y: 151, h: 210 },
    { x: 207, y: 188.5, h: 135 },
    { x: 243, y: 211, h: 90 },
    { x: 279, y: 188.5, h: 135 },
    { x: 315, y: 151, h: 210 },
    { x: 351, y: 113.5, h: 285 },
    { x: 387, y: 158.5, h: 195 },
    { x: 423, y: 203.5, h: 105 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width="26" height={b.h} rx="13" fill="#EDEDF2" />
      ))}
    </svg>
  );
}

function VoteBar({ votesA, votesB }) {
  const total = votesA + votesB || 1;
  const pctA = Math.round((votesA / total) * 100);
  return (
    <div style={{ position: "relative", height: 10, borderRadius: 6, overflow: "hidden", background: "#26262f", display: "flex" }}>
      <div style={{ width: `${pctA}%`, background: "#FF3D7A", transition: "width 0.6s cubic-bezier(.2,.8,.2,1)" }} />
      <div style={{ width: `${100 - pctA}%`, background: "#FFD23F", transition: "width 0.6s cubic-bezier(.2,.8,.2,1)" }} />
    </div>
  );
}

function SongSlot({ song, side, votes, pct, voted, onVote, winning }) {
  const color = side === "a" ? "#FF3D7A" : "#FFD23F";
  const canVote = !voted;
  return (
    <button
      onClick={() => canVote && onVote(side)}
      disabled={!canVote}
      style={{
        flex: 1,
        textAlign: "left",
        background: "#1B1B24",
        border: `1.5px solid ${voted === side ? color : "#2C2C38"}`,
        borderRadius: 14,
        padding: "14px",
        cursor: canVote ? "pointer" : "default",
        position: "relative",
        transition: "border-color 0.2s",
      }}
    >
      {voted && winning === side && (
        <div style={{ position: "absolute", top: -10, right: 10, background: color, color: "#0B0B12", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 10, padding: "3px 8px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
          <Trophy size={11} /> WINNING
        </div>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 8,
            flexShrink: 0,
            background: song.art ? `url(${song.art})` : PLACEHOLDER_GRADIENTS[song.grad ?? 0],
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: "#EDEDF2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {song.title}
          </div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, color: "#8A8A99", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {song.artist}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color, fontWeight: 600 }}>{pct}%</span>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8A8A99" }}>{votes} votes</span>
      </div>
    </button>
  );
}

function BattleCard({ battle, onVote }) {
  const total = battle.votesA + battle.votesB || 1;
  const pctA = Math.round((battle.votesA / total) * 100);
  const pctB = 100 - pctA;
  const winning = battle.votesA === battle.votesB ? null : battle.votesA > battle.votesB ? "a" : "b";

  return (
    <div style={{ background: "#16161F", border: "1px solid #23232E", borderRadius: 18, padding: 16, marginBottom: 14 }}>
      {battle.promptImage ? (
        <div style={{ marginBottom: 12, borderRadius: 12, overflow: "hidden", position: "relative" }}>
          <img src={battle.promptImage} alt="battle prompt" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(11,11,18,0.75)", borderRadius: 20, padding: "4px 9px", display: "flex", alignItems: "center", gap: 5 }}>
            <ImageIcon size={11} color="#FFD23F" />
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#EDEDF2", fontWeight: 600 }}>PIC BATTLE</span>
          </div>
          {battle.prompt && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(11,11,18,0.9))", padding: "20px 10px 8px" }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12.5, fontWeight: 600, color: "#EDEDF2" }}>{battle.prompt}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Zap size={13} color="#FFD23F" />
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: "#B8B8C4", lineHeight: 1.3 }}>
            {battle.prompt}
          </span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <SongSlot song={battle.songA} side="a" votes={battle.votesA} pct={pctA} voted={battle.voted} winning={winning} onVote={(s) => onVote(battle.id, s)} />
        <div style={{ display: "flex", alignItems: "center", fontFamily: "'Anton',sans-serif", fontSize: 15, color: "#3C3C48" }}>VS</div>
        <SongSlot song={battle.songB} side="b" votes={battle.votesB} pct={pctB} voted={battle.voted} winning={winning} onVote={(s) => onVote(battle.id, s)} />
      </div>
      <div style={{ marginTop: 12 }}>
        <VoteBar votesA={battle.votesA} votesB={battle.votesB} />
      </div>
    </div>
  );
}

function SongSearch({ label, color, onPick, picked }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      setErr(false);
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=6`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (e) {
        setErr(true);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => clearTimeout(timer.current);
  }, [q]);

  if (picked) {
    return (
      <div style={{ background: "#1B1B24", border: `1.5px solid ${color}`, borderRadius: 12, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0, background: picked.art ? `url(${picked.art})` : PLACEHOLDER_GRADIENTS[0], backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#EDEDF2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{picked.title}</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, color: "#8A8A99" }}>{picked.artist}</div>
        </div>
        <button onClick={() => onPick(null)} style={{ background: "none", border: "none", color: "#8A8A99", cursor: "pointer", padding: 4 }}>
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ position: "relative", marginBottom: results.length ? 8 : 0 }}>
        <Search size={14} color="#5C5C6B" style={{ position: "absolute", left: 12, top: 12 }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a song or artist..."
          style={{
            width: "100%",
            background: "#1B1B24",
            border: "1.5px solid #2C2C38",
            borderRadius: 10,
            padding: "10px 12px 10px 34px",
            color: "#EDEDF2",
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      {loading && <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#5C5C6B", padding: "4px 2px" }}>searching...</div>}
      {err && <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#5C5C6B", padding: "4px 2px" }}>couldn't reach search — try again</div>}
      {results.map((r) => (
        <button
          key={r.trackId}
          onClick={() => onPick({ title: r.trackName, artist: r.artistName, art: r.artworkUrl100 })}
          style={{
            width: "100%",
            display: "flex",
            gap: 10,
            alignItems: "center",
            background: "#1B1B24",
            border: "1px solid #23232E",
            borderRadius: 10,
            padding: 8,
            marginBottom: 6,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ width: 34, height: 34, borderRadius: 5, flexShrink: 0, background: `url(${r.artworkUrl100}) center/cover` }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 12.5, color: "#EDEDF2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.trackName}</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11.5, color: "#8A8A99", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.artistName}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function CreateBattle({ onCancel, onCreate, creating, token, userId }) {
  const [mode, setMode] = useState("text");
  const [prompt, setPrompt] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [photoData, setPhotoData] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [songA, setSongA] = useState(null);
  const [songB, setSongB] = useState(null);
  const fileInputRef = useRef(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestErr, setSuggestErr] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [uploading, setUploading] = useState(false);

  const finalPrompt = mode === "photo" ? caption.trim() : (customPrompt.trim() || prompt);
  const canCreate = mode === "photo" ? (photoData && songA && songB) : (finalPrompt && songA && songB);

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoData(reader.result);
      suggestCaption(reader.result, file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  };

  const suggestCaption = async (dataUrl, mediaType) => {
    setSuggesting(true);
    setSuggestErr(false);
    try {
      const base64 = dataUrl.split(",")[1];
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 30,
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
                { type: "text", text: "Look at this photo. Write a short, punchy 2-6 word caption capturing its vibe/mood, for a music app battle where people pick a song that fits the photo. Respond with ONLY the caption text, no quotes, no punctuation at the end, nothing else." },
              ],
            },
          ],
        }),
      });
      const data = await res.json();
      const text = (data.content || []).map((c) => c.text || "").join("").trim();
      if (text) setCaption(text);
      else setSuggestErr(true);
    } catch (e) {
      setSuggestErr(true);
    } finally {
      setSuggesting(false);
    }
  };

  const submit = async () => {
    setCreateErr("");
    try {
      let imageUrl = null;
      if (mode === "photo" && photoFile) {
        setUploading(true);
        imageUrl = await uploadBattlePhoto(photoFile, userId, token);
        setUploading(false);
      }
      await onCreate({ prompt: finalPrompt, promptImage: imageUrl, mode, songA, songB });
    } catch (e) {
      setUploading(false);
      setCreateErr(e.message || "Couldn't create the battle");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "#8A8A99", cursor: "pointer", display: "flex" }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: "#EDEDF2", letterSpacing: 0.5 }}>NEW BATTLE</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#1B1B24", borderRadius: 10, padding: 4 }}>
        <button
          onClick={() => setMode("text")}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "'Space Grotesk',sans-serif", fontSize: 12.5, fontWeight: 600,
            padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer",
            background: mode === "text" ? "#2C2C38" : "transparent",
            color: mode === "text" ? "#EDEDF2" : "#5C5C6B",
          }}
        >
          <Type size={13} /> Text prompt
        </button>
        <button
          onClick={() => setMode("photo")}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "'Space Grotesk',sans-serif", fontSize: 12.5, fontWeight: 600,
            padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer",
            background: mode === "photo" ? "#2C2C38" : "transparent",
            color: mode === "photo" ? "#EDEDF2" : "#5C5C6B",
          }}
        >
          <ImageIcon size={13} /> Photo prompt
        </button>
      </div>

      {mode === "text" ? (
        <>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8A8A99", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Pick a prompt
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {PRESET_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => { setPrompt(p); setCustomPrompt(""); }}
                style={{
                  fontFamily: "'Space Grotesk',sans-serif",
                  fontSize: 12,
                  padding: "7px 10px",
                  borderRadius: 20,
                  border: `1px solid ${prompt === p ? "#FF3D7A" : "#2C2C38"}`,
                  background: prompt === p ? "rgba(255,61,122,0.12)" : "#1B1B24",
                  color: prompt === p ? "#FF3D7A" : "#B8B8C4",
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            value={customPrompt}
            onChange={(e) => { setCustomPrompt(e.target.value); setPrompt(""); }}
            placeholder="...or write your own prompt"
            style={{
              width: "100%",
              background: "#1B1B24",
              border: "1.5px solid #2C2C38",
              borderRadius: 10,
              padding: "10px 12px",
              color: "#EDEDF2",
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 20,
            }}
          />
        </>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#8A8A99", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Upload a photo
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          {photoData ? (
            <div style={{ position: "relative", marginBottom: 10, borderRadius: 12, overflow: "hidden" }}>
              <img src={photoData} alt="upload preview" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
              <button
                onClick={() => setPhotoData(null)}
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(11,11,18,0.75)", border: "none", borderRadius: 20, padding: 6, color: "#EDEDF2", cursor: "pointer", display: "flex" }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                width: "100%", height: 120, borderRadius: 12, border: "1.5px dashed #2C2C38", background: "#1B1B24",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                color: "#5C5C6B", cursor: "pointer", marginBottom: 10,
              }}
            >
              <Upload size={20} />
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12.5 }}>Tap to choose a photo</span>
            </button>
          )}
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add context, optional (e.g. 'the vibe of this sunset')"
            style={{
              width: "100%",
              background: "#1B1B24",
              border: "1.5px solid #2C2C38",
              borderRadius: 10,
              padding: "10px 12px",
              color: "#EDEDF2",
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {suggesting && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#5C5C6B" }}>
              <Sparkles size={12} /> reading the vibe...
            </div>
          )}
          {!suggesting && suggestErr && (
            <div style={{ marginTop: 7, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#5C5C6B" }}>
              couldn't auto-caption — write your own above
            </div>
          )}
          {!suggesting && !suggestErr && photoData && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#3DDC97" }}>
              <Sparkles size={12} /> auto-suggested — edit it however you like
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <SongSearch label="Your pick" color="#FF3D7A" onPick={(s) => setSongA(s)} picked={songA} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <SongSearch label="Opponent's pick" color="#FFD23F" onPick={(s) => setSongB(s)} picked={songB} />
      </div>

      {createErr && (
        <div style={{ marginBottom: 12, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#FF3D7A" }}>{createErr}</div>
      )}

      <button
        disabled={!canCreate || creating || uploading}
        onClick={submit}
        style={{
          width: "100%",
          padding: "13px",
          borderRadius: 12,
          border: "none",
          background: canCreate && !creating && !uploading ? "linear-gradient(90deg,#FF3D7A,#FFD23F)" : "#23232E",
          color: canCreate && !creating && !uploading ? "#0B0B12" : "#5C5C6B",
          fontFamily: "'Anton',sans-serif",
          fontSize: 15,
          letterSpacing: 0.5,
          cursor: canCreate && !creating && !uploading ? "pointer" : "default",
        }}
      >
        {uploading ? "UPLOADING PHOTO..." : creating ? "STARTING..." : "START BATTLE"}
      </button>
    </div>
  );
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const inputStyle = {
    width: "100%",
    background: "#1B1B24",
    border: "1.5px solid #2C2C38",
    borderRadius: 10,
    padding: "11px 12px 11px 36px",
    color: "#EDEDF2",
    fontFamily: "'Space Grotesk',sans-serif",
    fontSize: 13.5,
    outline: "none",
    boxSizing: "border-box",
  };

  const submit = async () => {
    setError("");
    setNotice("");
    if (!email.trim() || !password) { setError("Enter an email and password."); return; }
    if (mode === "signup" && !username.trim()) { setError("Pick a username."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const signupData = await sb("/auth/v1/signup", { method: "POST", body: { email: email.trim(), password } });
        if (signupData.access_token && signupData.user) {
          await sb("/rest/v1/profiles", {
            method: "POST",
            token: signupData.access_token,
            headers: { Prefer: "return=minimal" },
            body: { id: signupData.user.id, username: username.trim() },
          });
          onAuthed({ token: signupData.access_token, user: signupData.user });
        } else {
          setNotice("Check your email to confirm your account, then sign in.");
          setMode("signin");
        }
      } else {
        const tokenData = await sb("/auth/v1/token?grant_type=password", { method: "POST", body: { email: email.trim(), password } });
        onAuthed({ token: tokenData.access_token, user: tokenData.user });
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 340, margin: "60px auto 0" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <WavrMark size={36} />
          <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 34, color: "#EDEDF2", letterSpacing: 1 }}>WAVR</span>
        </div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, color: "#5C5C6B" }}>ride the wave.</div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18, background: "#1B1B24", borderRadius: 10, padding: 4 }}>
        <button onClick={() => { setMode("signin"); setError(""); setNotice(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", fontSize: 12.5, fontWeight: 600, background: mode === "signin" ? "#2C2C38" : "transparent", color: mode === "signin" ? "#EDEDF2" : "#5C5C6B" }}>
          Sign in
        </button>
        <button onClick={() => { setMode("signup"); setError(""); setNotice(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", fontSize: 12.5, fontWeight: 600, background: mode === "signup" ? "#2C2C38" : "transparent", color: mode === "signup" ? "#EDEDF2" : "#5C5C6B" }}>
          Sign up
        </button>
      </div>

      {mode === "signup" && (
        <div style={{ position: "relative", marginBottom: 10 }}>
          <UserIcon size={14} color="#5C5C6B" style={{ position: "absolute", left: 12, top: 13 }} />
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" style={inputStyle} />
        </div>
      )}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Mail size={14} color="#5C5C6B" style={{ position: "absolute", left: 12, top: 13 }} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
      </div>
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Lock size={14} color="#5C5C6B" style={{ position: "absolute", left: 12, top: 13 }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" style={inputStyle} />
      </div>

      {error && <div style={{ marginBottom: 12, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#FF3D7A" }}>{error}</div>}
      {notice && <div style={{ marginBottom: 12, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: "#3DDC97" }}>{notice}</div>}

      <button
        disabled={loading}
        onClick={submit}
        style={{
          width: "100%", padding: "13px", borderRadius: 12, border: "none",
          background: loading ? "#23232E" : "linear-gradient(90deg,#FF3D7A,#FFD23F)",
          color: loading ? "#5C5C6B" : "#0B0B12",
          fontFamily: "'Anton',sans-serif", fontSize: 15, letterSpacing: 0.5,
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? "..." : mode === "signup" ? "CREATE ACCOUNT" : "SIGN IN"}
      </button>
    </div>
  );
}

function SetupBanner() {
  return (
    <div style={{ maxWidth: 420, margin: "60px auto 0", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 18 }}>
        <WavrMark size={36} />
        <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 34, color: "#EDEDF2", letterSpacing: 1 }}>WAVR</span>
      </div>
      <div style={{ background: "#16161F", border: "1px solid #23232E", borderRadius: 16, padding: 20 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: "#EDEDF2", marginBottom: 8 }}>
          Backend not connected yet
        </div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12.5, color: "#8A8A99", lineHeight: 1.6 }}>
          Open this file's code and fill in <code style={{ color: "#FFD23F" }}>SUPABASE_URL</code> and{" "}
          <code style={{ color: "#FFD23F" }}>SUPABASE_ANON_KEY</code> near the top with the values from your
          Supabase project's Settings → API page, and run the schema.sql script in the SQL Editor first if you
          haven't yet.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null); // { token, user }
  const [battles, setBattles] = useState([]);
  const [view, setView] = useState("home");
  const [loadingBattles, setLoadingBattles] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_LINK;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const loadBattles = useCallback(async () => {
    if (!session) return;
    setLoadingBattles(true);
    setLoadErr("");
    try {
      const rows = await sb("/rest/v1/battles?select=*,votes(side,voter_id)&status=eq.active&order=created_at.desc", { token: session.token });
      setBattles(rows.map((r) => transformBattle(r, session.user.id)));
    } catch (e) {
      setLoadErr(e.message || "Couldn't load battles");
    } finally {
      setLoadingBattles(false);
    }
  }, [session]);

  useEffect(() => { loadBattles(); }, [loadBattles]);

  const handleVote = async (battleId, side) => {
    setBattles((prev) => prev.map((b) => {
      if (b.id !== battleId || b.voted) return b;
      return { ...b, votesA: side === "a" ? b.votesA + 1 : b.votesA, votesB: side === "b" ? b.votesB + 1 : b.votesB, voted: side };
    }));
    try {
      await sb("/rest/v1/votes", {
        method: "POST",
        token: session.token,
        headers: { Prefer: "return=minimal" },
        body: { battle_id: battleId, voter_id: session.user.id, side },
      });
    } catch (e) {
      loadBattles();
    }
  };

  const handleCreate = async ({ prompt, promptImage, mode, songA, songB }) => {
    setCreating(true);
    try {
      const [row] = await sb("/rest/v1/battles", {
        method: "POST",
        token: session.token,
        headers: { Prefer: "return=representation" },
        body: {
          creator_id: session.user.id,
          prompt_type: mode,
          prompt_text: prompt || null,
          prompt_image_url: promptImage || null,
          song_a_title: songA.title,
          song_a_artist: songA.artist,
          song_a_art_url: songA.art || null,
          song_b_title: songB.title,
          song_b_artist: songB.artist,
          song_b_art_url: songB.art || null,
        },
      });
      setBattles((prev) => [transformBattle({ ...row, votes: [] }, session.user.id), ...prev]);
      setView("home");
    } finally {
      setCreating(false);
    }
  };

  const signOut = () => { setSession(null); setBattles([]); };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B12", padding: "20px 16px 40px" }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        {!isConfigured ? (
          <SetupBanner />
        ) : !session ? (
          <AuthScreen onAuthed={setSession} />
        ) : view === "home" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <WavrMark size={32} />
                  <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 30, color: "#EDEDF2", letterSpacing: 1 }}>WAVR</span>
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, color: "#5C5C6B", marginTop: -2 }}>ride the wave.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setView("create")}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "#1B1B24", border: "1px solid #2C2C38", borderRadius: 10, padding: "9px 13px", color: "#EDEDF2", fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  <Plus size={15} /> Battle
                </button>
                <button onClick={signOut} title="Sign out" style={{ display: "flex", alignItems: "center", background: "#1B1B24", border: "1px solid #2C2C38", borderRadius: 10, padding: "9px 11px", color: "#8A8A99", cursor: "pointer" }}>
                  <LogOut size={15} />
                </button>
              </div>
            </div>

            {loadingBattles && (
              <div style={{ textAlign: "center", padding: 20, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#5C5C6B" }}>loading battles...</div>
            )}
            {loadErr && (
              <div style={{ textAlign: "center", padding: 20, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#FF3D7A" }}>{loadErr}</div>
            )}
            {!loadingBattles && !loadErr && battles.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "#5C5C6B" }}>
                No battles yet — start the first one.
              </div>
            )}

            {battles.map((b) => (
              <BattleCard key={b.id} battle={b} onVote={handleVote} />
            ))}
          </>
        ) : (
          <CreateBattle onCancel={() => setView("home")} onCreate={handleCreate} creating={creating} token={session.token} userId={session.user.id} />
        )}
      </div>
    </div>
  );
}
