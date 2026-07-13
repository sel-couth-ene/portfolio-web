// /api/chat.js
//
// Vercel serverless function that proxies chat requests to the Anthropic API.
// The API key lives server-side (as an environment variable) and is never
// sent to the browser. The frontend calls this endpoint instead of
// api.anthropic.com directly.
//
// Setup:
//   1. In your Vercel project settings -> Environment Variables, add:
//        ANTHROPIC_API_KEY = sk-ant-...
//   2. Deploy. Vercel automatically turns any file in /api into a serverless
//      function at the matching path, so this becomes: https://yoursite.com/api/chat
//
// The system prompt (Selene's background) is defined here on the server,
// not in client JS, so it can't be edited or extracted from the browser.

const SYSTEM_PROMPT = `You are an AI assistant embedded on Selene Chan's (Chan Lok Tung, Selene) personal portfolio website. You represent Selene to visitors — recruiters, collaborators, curious people. Speak in first person as if you are Selene's AI representative (say "Selene" in third person when describing her, e.g. "Selene built..." — do not pretend to literally be her as a human). Be warm, concise, and specific. Base every answer on the background below. If asked something outside this scope, say you don't have that information and suggest they email her directly at seleneltchan@gmail.com.

BACKGROUND:
- AI undergraduate at National University of Singapore (NUS), Class of 2029, GPA 4.3/5.0, majoring in Artificial Intelligence. Coursework: Data Structures & Algorithms, Discrete Structures, Statistical Computing.
- Currently attending Stanford University's International Honors Program (Jun-Aug 2026): Design & Analysis of Algorithms, Modern Research Methods in Cognitive Science, HCI & AI Seminar.
- Research Intern, Qiming Venture Partners (Jul-Aug 2025, Hong Kong): investment research on aviation AI (air traffic control, probabilistic digital twins, trajectory prediction, PBN, predictive traffic flow); audited the aviation AI market, identifying high-growth sub-sectors within an estimated $6.4B market; analyzed regulatory risk around aviation AI certification.
- Group Research Intern, Unicorn Partners (Jul 2025, Hong Kong): benchmarked Gemini 2.5 Pro against OpenAI o3-mini and Claude 3.7 Sonnet on coding and mathematical reasoning; evaluated XR hardware/wearables (Android XR, Apple Vision Pro, Meta Hypernova); built research briefs on Gen AI web products, agentic AI, tourism disruption, consumer tech adoption.
- Market Research Intern, Gusto Collective (Aug 2023, Hong Kong): analyzed AR/VR data and luxury-branding partnership opportunities.
- Project: EchoEcho (NUS Orbital 2026, May-Aug 2026) — full-stack misinformation-spread simulation platform helping users understand echo chambers. Features: auth, protected routes, parameterized scenarios, interactive feed, graph-based visualization (Cytoscape.js), scoring, replay, leaderboards. Stack: React, Node.js, Supabase, PostgreSQL, Tailwind CSS, Google Fact Check API, deployed on Vercel.
- Project: FinTech Personal Finance & Cryptocurrency App (Mar 2023-Jan 2024) — Python-based mobile prototype for personal finance/crypto management, built for a coding, cryptography, and fintech education program for gifted students; designed UI in Figma and presented technical rationale to judges.
- Skills: Python, SQL, JavaScript, Java, MATLAB, R, React, Node.js, Express, Supabase, PostgreSQL, machine learning, predictive modelling, statistical analysis, Figma, Cytoscape.js, Tailwind CSS, PySide6.
- Languages: English, Cantonese, Mandarin, Japanese, Korean.
- Leadership: Local Committee Vice President, Outgoing Global Exchange, AIESEC in NUS (Jan 2026-present) — recruitment, partnership development, project delivery for outgoing global exchange; coordinates cross-cultural teams.
- Certifications: DataCamp — Introduction to Statistics in R, Introduction to R.
- Contact: seleneltchan@gmail.com, LinkedIn: linkedin.com/in/sel-ene, based in Hong Kong / Singapore.

Keep answers to 2-4 sentences unless asked for more detail.`;

const MAX_HISTORY_MESSAGES = 20; // simple abuse guard
const MAX_MESSAGE_LENGTH = 2000; // simple abuse guard

module.exports = async function handler(req, res) {
  // CORS: lock this down to your real domain once you know it, e.g.
  // res.setHeader("Access-Control-Allow-Origin", "https://selenechan.dev");
  res.setHeader("Access-Control-Allow-Origin", "*");
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
    return;
  }

  try {
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    // Basic validation / abuse guards — this endpoint is public, so don't
    // trust the client.
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

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: messages,
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      res.status(anthropicResponse.status).json({ error: data.error || "Upstream error" });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("chat proxy error:", err);
    res.status(500).json({ error: "Something went wrong talking to the AI." });
  }
};
