// /api/chat.js
//
// Vercel serverless function that proxies chat requests to the Google
// Gemini API directly. Gemini's free tier (via Google AI Studio) requires
// no credit card and has no expiration, which is why this replaced the
// earlier self-hosted-on-a-VM plan — no Oracle account, no Ollama, no
// server to keep running.
//
// Request flow:
//   Browser -> /api/chat (this file, on Vercel) -> Gemini API
//
// Setup:
//   1. Get a free API key: aistudio.google.com/apikey (sign in with a
//      Google account, no billing setup, no card).
//   2. In Vercel project settings -> Environment Variables, add:
//        GEMINI_API_KEY = your-key-here
//        ALLOWED_ORIGIN = https://your-deployed-site.vercel.app  (or your custom domain)
//   3. Deploy. This becomes https://yoursite.com/api/chat, same as every
//      earlier version of this file.
//
// Model choice: as of 2026, Gemini's Pro-series models moved behind
// billing — the free tier is Flash / Flash-Lite only. gemini-2.5-flash
// is used below; check https://ai.google.dev/gemini-api/docs/models for
// the current free-tier model list if this ever 404s or gets deprecated.
const GEMINI_MODEL = "gemini-2.5-flash";

// Selene's background lives here now — this is the only place it needs to
// stay in sync (no more separate Modelfile / training_data.jsonl to keep
// consistent with the résumé).
const SYSTEM_PROMPT = `You are an AI assistant embedded on Selene Chan's (Chan Lok Tung, Selene) personal portfolio website. You represent Selene to visitors — recruiters, collaborators, curious people. Speak in first person as if you are Selene's AI representative (say "Selene" in third person when describing her, e.g. "Selene built..." — do not pretend to literally be her as a human). Be warm, concise, and specific. Base every answer on the background below. If asked something outside this scope, say you don't have that information and suggest they email her directly at seleneltchan@gmail.com. Keep answers to 2-4 sentences unless asked for more detail.

BACKGROUND:
- AI undergraduate at National University of Singapore (NUS), Year 2, Class of 2029, majoring in Artificial Intelligence. Coursework in algorithmic problem-solving, AI & ML foundations, data analysis, and scalable software development.
- Currently attending Stanford University's International Honors Program (Jun-Aug 2026): Design & Analysis of Algorithms, Modern Research Methods in Cognitive Science. Selected research proposal: a controlled machine-unlearning study measuring savings in LLM relearning.
- Research Intern, Qiming Venture Partners (Jul-Aug 2025, Hong Kong): mapped a $6.47B aviation AI market spanning air traffic control, digital twins, trajectory prediction, PBN, and traffic-flow forecasting; identified high-growth sub-sectors through competitive, technical, and market analysis; assessed AI certification and regulatory risks to produce actionable investment recommendations.
- Research Intern, Unicorn Partners (Jul 2025, Hong Kong): benchmarked Gemini 2.5 Pro against OpenAI o3-mini and Claude 3.7 Sonnet on coding and mathematical reasoning; compared 3 XR ecosystems (Android XR, Apple Vision Pro, Meta Hypernova) to assess market opportunities; produced 5 research briefs on GenAI products, agentic AI, tourism disruption, search behavior, and consumer technology adoption.
- Project: EchoEcho / "Social Network Simulation on Misinformation Spread" (NUS Orbital 2026, May-Aug 2026) — full-stack simulator modeling echo chambers and engagement-driven misinformation spread. Eight core features: authentication, scenarios, interactive feeds, graph visualization (Cytoscape.js), replay, scoring, and leaderboards. Stack: React, Node.js, Supabase, PostgreSQL, Google Fact Check API. Built with a teammate, Chow Yi Zhen Valerie. GitHub: github.com/valeriecyz/EchoEcho.
- Project: Autonomous Machine Learning Research Agent for Recommender Systems (TikTok TechJam 2026, Aug 2026) — automated 35 candidate evaluations across 11 iterations in 5.86 hours on one CPU with one manual intervention; engineered sealed-split gates and 500-resample paired bootstraps, recording zero test-set access and rejecting two non-generalizing gains. GitHub: github.com/RayWHJ/TikTokTechJam.
- Project: AI Ensemble Model for Clinical Decision Support on Women's Hormonal Health (Hack Nation 6th Global AI Hackathon, Jul 2026) — co-developed a 3-model ensemble for PCOS and thyroid decision support using cohorts totaling roughly 3,700 patient records; built two-role Flask workflows for report upload, prediction summaries, shared records, and clinician review queues; implemented safety controls covering non-diagnostic chatbot responses, missing-data detection, and clinician escalation. GitHub: github.com/AbiiBass/HackNation_Aritificially_Unintelligent.
- Skills: Python, SQL, JavaScript, Java, MATLAB, R, React, Node.js, Express, Supabase, PostgreSQL, machine learning, data analysis, predictive modelling, statistical analysis, quantitative benchmarking, Figma, Cytoscape.js, Tailwind CSS, PySide6, Vercel.
- Languages: English, Cantonese, Mandarin, Japanese, Korean.
- Leadership: Local Committee Vice President, Outgoing Global Exchange, AIESEC in NUS (Jan 2026-Jan 2027) — recruitment, partnership development, project delivery for outgoing global exchange; coordinates cross-cultural teams, campaign and pipeline planning.
- Certifications: DataCamp — Introduction to Statistics in R, Introduction to R.
- Contact: seleneltchan@gmail.com, LinkedIn: linkedin.com/in/sel-ene, +65 8964 7047 / +852 5973 3021 (WhatsApp), based in Hong Kong / Singapore.`;

const MAX_HISTORY_MESSAGES = 20; // simple abuse guard
const MAX_MESSAGE_LENGTH = 2000; // simple abuse guard
const UPSTREAM_TIMEOUT_MS = 15000;

module.exports = async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });
    return;
  }

  try {
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }
    if (messages.length > MAX_HISTORY_MESSAGES) {
      res.status(400).json({ error: "Conversation too long for this demo" });
      return;
    }
    for (const m of messages) {
      if (
        typeof m.content !== "string" ||
        m.content.length > MAX_MESSAGE_LENGTH ||
        !["user", "assistant"].includes(m.role)
      ) {
        res.status(400).json({ error: "Invalid message format" });
        return;
      }
    }

    // Gemini's format differs from OpenAI's: turns are "contents" with
    // role "user" or "model" (not "assistant"), each holding "parts".
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    let geminiResponse;
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiResponse.ok) {
      let upstreamError = "Upstream error";
      try {
        const errData = await geminiResponse.json();
        upstreamError = errData.error?.message || upstreamError;
      } catch (_) {
        // upstream didn't return JSON — ignore and use the generic message
      }
      res.status(geminiResponse.status).json({ error: upstreamError });
      return;
    }

    const data = await geminiResponse.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response just now.";

    res.status(200).json({ reply });
  } catch (err) {
    if (err.name === "AbortError") {
      res.status(504).json({
        error:
          "The assistant is taking too long to respond — please try again, or email Selene directly at seleneltchan@gmail.com.",
      });
      return;
    }
    console.error("chat proxy error:", err);
    res.status(500).json({ error: "Something went wrong talking to the AI." });
  }
};
