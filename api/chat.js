// /api/chat.js
//
// Vercel serverless function that proxies chat requests to a self-hosted
// Ollama instance running Selene's LoRA fine-tuned Phi-4-mini-instruct model
// on an Oracle Cloud Always Free Ampere A1 VM, instead of the OpenAI API.
//
// Request flow:
//   Browser -> /api/chat (this file, on Vercel)
//           -> https://<your-vm-domain>/v1/chat/completions (Caddy -> Ollama, on Oracle)
//
// The VM is not meant to be called directly by the browser: this function
// is the only thing that holds the shared secret that Caddy checks before
// forwarding to Ollama, so the secret never reaches client JS.
//
// Setup:
//   1. On the VM: Caddy terminates HTTPS and forwards to Ollama on
//      localhost:11434, but only when the request carries the header
//      "X-Api-Key: <OLLAMA_API_SECRET>" (see the Caddyfile in the deployment
//      guide). This is what stands in for "auth" here — Ollama itself has
//      no built-in auth, so Caddy is the enforcement point.
//   2. In Vercel project settings -> Environment Variables, add:
//        OLLAMA_ENDPOINT   = https://your-vm-domain.example.com/v1/chat/completions
//        OLLAMA_MODEL      = selene-assistant     (the name from `ollama create selene-assistant -f Modelfile`)
//        OLLAMA_API_SECRET = <same long random string configured in the Caddyfile>
//        ALLOWED_ORIGIN    = https://selenechan.dev   (your real deployed domain)
//   3. Deploy. This becomes https://yoursite.com/api/chat, same as before.
//
// NOTE ON THE SYSTEM PROMPT: unlike the old OpenAI version, we do NOT send a
// system prompt from here. Selene's background is already baked into the
// model two ways — the SYSTEM directive in the Modelfile (used whenever the
// model is invoked with no system message) and the LoRA fine-tuning itself
// (training_data.jsonl). Keeping it out of this function means one less
// place that background has to be kept in sync, and a smaller request body
// to a CPU-bound VM where every token of prompt costs real latency.

const MAX_HISTORY_MESSAGES = 20; // simple abuse guard
const MAX_MESSAGE_LENGTH = 2000; // simple abuse guard
const UPSTREAM_TIMEOUT_MS = 25000; // fail fast + clearly, rather than hang until Vercel's own function timeout

module.exports = async function handler(req, res) {
  // CORS: locked to your real domain via env var. Falls back to "*" only if
  // you haven't set ALLOWED_ORIGIN yet — set it before going live.
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

  const endpoint = process.env.OLLAMA_ENDPOINT;
  const model = process.env.OLLAMA_MODEL;
  const apiSecret = process.env.OLLAMA_API_SECRET;

  if (!endpoint || !model || !apiSecret) {
    res.status(500).json({
      error: "Server is missing OLLAMA_ENDPOINT, OLLAMA_MODEL, or OLLAMA_API_SECRET",
    });
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

    // Guard against the VM being slow/unreachable so this function fails
    // clearly instead of hanging until Vercel's own execution limit kills it.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    let ollamaResponse;
    try {
      ollamaResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiSecret,
        },
        body: JSON.stringify({
          model,
          max_tokens: 500,
          messages,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!ollamaResponse.ok) {
      let upstreamError = "Upstream error";
      try {
        const errData = await ollamaResponse.json();
        upstreamError = errData.error || upstreamError;
      } catch (_) {
        // upstream didn't return JSON — ignore and use the generic message
      }
      res.status(ollamaResponse.status).json({ error: upstreamError });
      return;
    }

    const data = await ollamaResponse.json();

    // Ollama's OpenAI-compatible endpoint (/v1/chat/completions) mirrors
    // OpenAI's response shape, so this line is unchanged from the old
    // OpenAI version: choices[0].message.content.
    const reply =
      data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response just now.";

    // Normalized response shape so the frontend doesn't need to know which
    // provider is behind this endpoint.
    res.status(200).json({ reply });
  } catch (err) {
    if (err.name === "AbortError") {
      console.error("chat proxy timeout: VM did not respond in time");
      res.status(504).json({
        error:
          "The assistant is taking too long to respond — it may be waking up from idle. Please try again in a moment, or email Selene directly at seleneltchan@gmail.com.",
      });
      return;
    }
    console.error("chat proxy error:", err);
    res.status(500).json({ error: "Something went wrong talking to the AI." });
  }
};
