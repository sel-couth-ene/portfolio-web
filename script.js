// ---------- fade-in on scroll ----------
const fadeEls = document.querySelectorAll(".fade-in");
const fadeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("in");
    });
  },
  { threshold: 0.15 }
);
fadeEls.forEach((el) => fadeObserver.observe(el));

// ---------- trajectory rail ----------
const railSections = [
  { id: "background", label: "BACKGROUND" },
  { id: "experience", label: "EXPERIENCE" },
  { id: "projects", label: "PROJECTS" },
  { id: "skills", label: "SKILLS" },
  { id: "chat", label: "CHAT" },
  { id: "contact", label: "CONTACT" },
];
const rail = document.getElementById("rail");

function buildRail() {
  rail.innerHTML = '<div class="rail-line"></div>';
  railSections.forEach((s, i) => {
    const top = 120 + i * ((window.innerHeight - 240) / (railSections.length - 1));
    const node = document.createElement("div");
    node.className = "rail-node";
    node.style.top = top + "px";
    node.dataset.target = s.id;
    const label = document.createElement("div");
    label.className = "rail-label";
    label.style.top = top - 6 + "px";
    label.textContent = s.label;
    rail.appendChild(node);
    rail.appendChild(label);
  });
}
buildRail();
window.addEventListener("resize", buildRail);

const railObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const node = rail.querySelector('.rail-node[data-target="' + entry.target.id + '"]');
      if (!node) return;
      if (entry.isIntersecting) node.classList.add("active");
      else node.classList.remove("active");
    });
  },
  { threshold: 0.4 }
);
railSections.forEach((s) => {
  const el = document.getElementById(s.id);
  if (el) railObserver.observe(el);
});

// ---------- launcher <-> chat section ----------
const launcher = document.getElementById("launcher");
const chatSection = document.getElementById("chat");
launcher.addEventListener("click", () => chatSection.scrollIntoView({ behavior: "smooth" }));
document
  .getElementById("heroAskBtn")
  .addEventListener("click", () => chatSection.scrollIntoView({ behavior: "smooth" }));

const launcherObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => launcher.classList.toggle("hidden", e.isIntersecting));
  },
  { threshold: 0.2 }
);
launcherObserver.observe(chatSection);

// ---------- chat logic ----------
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

// In Claude's artifact preview, calls go straight to the Anthropic API
// (the key is injected by that environment). Once deployed to your own
// domain, this is switched to your backend proxy at /api/chat, which holds
// the API key server-side. Detect which environment we're in by checking
// the hostname.
const IS_CLAUDE_PREVIEW = window.location.hostname.includes("claude");
const CHAT_ENDPOINT = IS_CLAUDE_PREVIEW ? "https://api.anthropic.com/v1/messages" : "/api/chat";

let history = [];
const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

function addMessage(text, cls) {
  const div = document.createElement("div");
  div.className = "msg " + cls;
  div.textContent = text;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
  return div;
}

async function sendMessage(text) {
  if (!text || !text.trim()) return;
  addMessage(text, "user");
  history.push({ role: "user", content: text });
  chatInput.value = "";
  chatSend.disabled = true;
  const typingEl = addMessage("thinking…", "bot typing");

  try {
    // NOTE: when calling api.anthropic.com directly (Claude preview only),
    // the key is injected server-side by that environment. When deployed,
    // CHAT_ENDPOINT points to our own /api/chat, which holds the real
    // Anthropic API key server-side — never ship an API key in client JS.
    const requestBody = { model: "claude-sonnet-4-6", max_tokens: 1000, messages: history };
    if (IS_CLAUDE_PREVIEW) requestBody.system = SYSTEM_PROMPT;

    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    const textBlocks = (data.content || []).filter((b) => b.type === "text").map((b) => b.text);
    const reply = textBlocks.join("\n") || "Sorry, I couldn't generate a response just now.";
    typingEl.remove();
    addMessage(reply, "bot");
    history.push({ role: "assistant", content: reply });
  } catch (err) {
    typingEl.remove();
    addMessage(
      "I'm having trouble connecting right now — please try again, or email Selene directly at seleneltchan@gmail.com.",
      "bot"
    );
  } finally {
    chatSend.disabled = false;
  }
}

chatSend.addEventListener("click", () => sendMessage(chatInput.value));
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage(chatInput.value);
});
document.querySelectorAll(".suggested button").forEach((btn) => {
  btn.addEventListener("click", () => sendMessage(btn.dataset.q));
});
