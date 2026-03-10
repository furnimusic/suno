const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `You are a specialist in creating Suno AI prompts based on Suno's official documentation. Your prompts must be rich, detailed and immediately usable.

RULES:
- Always write prompts in English only
- NEVER mention specific artist names — describe styles, eras, atmospheres instead
- Maximize the 1000 character limit with rich detail: mood, instrumentation, genre, tempo, BPM, influences, atmosphere, emotion
- Use official Suno metatags where relevant

AVAILABLE METATAGS:
Structure: [Intro] [Verse] [Pre-Chorus] [Chorus] [Bridge] [Break] [Outro] [Fade Out] [Hook]
Dynamics: [Building Intensity] [Climactic] [Euphoric Build] [Crescendo] [Stripped Back] [Layered Arrangement] [Emotional Swell]
Atmosphere: [Serene Ambience] [Tense Underscore] [Melancholic Atmosphere] [Nostalgic Tones] [Ominous Drone]
Vocals: [Instrumental] [Male Vocal] [Female Vocal] [Harmonies] [Choir] [Spoken Word] [Whisper] [Vulnerable Vocals]
Instruments: [Instrumental Break] [Guitar Solo] [Piano Solo] [Drum Solo] [Percussion Break]

OUTPUT: Return ONLY the prompt. No explanation, no preamble. Max 1000 characters.`;

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Não autenticado" });
  try {
    req.user = jwt.verify(auth.slice(7), SUPABASE_JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

// ── AI callers (usam a key do usuário) ────────────────────────────────────────
async function callClaude(query, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: SYSTEM_PROMPT, messages: [{ role: "user", content: `Generate a Suno AI prompt based on: "${query}"` }] }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.map(b => b.text || "").join("") || "";
}

async function callOpenAI(query, apiKey) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 1000, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `Generate a Suno AI prompt based on: "${query}"` }] }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices?.[0]?.message?.content || "";
}

async function callGemini(query, apiKey) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\nGenerate a Suno AI prompt based on: "' + query + '"' }] }] }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ── /api/prompt ───────────────────────────────────────────────────────────────
app.post("/api/prompt", requireAuth, async (req, res) => {
  const { query, provider = "claude", apiKey } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });
  if (!apiKey) return res.status(400).json({ error: "API key não fornecida" });

  try {
    let text = "";
    if      (provider === "claude") text = await callClaude(query, apiKey);
    else if (provider === "openai") text = await callOpenAI(query, apiKey);
    else if (provider === "gemini") text = await callGemini(query, apiKey);
    else return res.status(400).json({ error: `Provedor inválido: ${provider}` });
    return res.json({ prompt: text.trim().slice(0, 1000) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`✅ FURNIMUSIC running on http://localhost:${PORT}`));
