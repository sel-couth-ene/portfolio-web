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
// The system prompt with Selene's background lives in two places server-side
// — the Modelfile's SYSTEM directive and the LoRA fine-tuning itself — never
// in client JS.

// This site's chatbot is powered by a self-hosted, LoRA fine-tuned model
// (Phi-4-mini-instruct) served via Ollama on an Oracle Cloud VM, proxied
// through /api/chat so the VM's address and auth secret stay server-side
// (see api/chat.js). This endpoint only works once deployed with
// OLLAMA_ENDPOINT, OLLAMA_MODEL, OLLAMA_API_SECRET, and ALLOWED_ORIGIN set
// in your environment — see api/chat.js and DEPLOYMENT.md for setup notes.
// To test locally before deploying, run `vercel dev` with a .env.local file
// containing those same variables.
const CHAT_ENDPOINT = "/api/chat";

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
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    const data = await response.json();
    const reply = data.reply || "Sorry, I couldn't generate a response just now.";
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
