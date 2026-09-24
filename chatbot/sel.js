/*
 * Sel — keyword chatbot for Selene's portfolio.
 *
 * Modelled on the Sel desktop app (github.com/sel-couth-ene/ip):
 * avatar + bordered bubble per message, a light-red bubble starting with
 * "!" when Sel can't match anything, and a "^ help" button that slides a
 * command panel up from the input bar.
 *
 * No server and no API key: everything runs in the browser, so the site
 * works on GitHub Pages as-is. Answers live in chatbot/knowledge.js.
 */
(function () {
  "use strict";

  const KNOWLEDGE = window.SEL_KNOWLEDGE || [];
  const GROUPS = window.SEL_GROUPS || [];
  const GAPS = window.SEL_GAPS || { keywords: [], answer: () => "" };

  // ---------- matching ----------

  // Lowercase, keep letters/digits plus + and # (for c++, c#), collapse
  // everything else to single spaces, and pad so " kw " matches whole words.
  function normalise(text) {
    return " " + text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim() + " ";
  }

  // A second copy with simple plurals stripped: "agents" -> "agent".
  function singularise(padded) {
    return padded
      .split(" ")
      .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
      .join(" ");
  }

  function hits(texts, keyword) {
    const k = " " + normalise(keyword).trim() + " ";
    return texts.some((t) => t.includes(k));
  }

  // Score each category: a matched phrase counts once per word in it, so
  // "responsible ai" (2) outranks a bare "ai" (1).
  function rank(input) {
    const base = normalise(input);
    const texts = [base, singularise(base)];
    return KNOWLEDGE.map((cat, order) => {
      let score = 0;
      const matched = [];
      cat.keywords.forEach((kw) => {
        if (hits(texts, kw)) {
          score += kw.split(" ").length * (cat.boost || 1);
          matched.push(kw);
        }
      });
      return { cat, score, matched, order };
    })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.order - b.order);
  }

  function findGap(input) {
    const base = normalise(input);
    const texts = [base, singularise(base)];
    return GAPS.keywords.find((kw) => hits(texts, kw)) || null;
  }

  // Returns { html, error, related: [category labels] }
  function respond(raw) {
    const input = raw.trim();
    const cmd = input.toLowerCase();

    if (cmd === "help" || cmd === "list" || cmd === "keywords") {
      return {
        html:
          "Here's everything I can talk about. Type any keyword, or tap one in the help panel:<br>" +
          GROUPS.map((g) => g.show.map((w) => "<i>" + w + "</i>").join(", ") + " &ndash; " + g.label).join("<br>"),
      };
    }
    if (/^(hi|hello|hey|yo|sup|hiya)\b/.test(cmd)) {
      return {
        html:
          "Hey! Ask me about Selene using any keyword you'd put in a job search: <i>Python</i>, <i>RAG</i>, <i>leadership</i>, <i>GPA</i>. I'll tell you where she's done it.",
      };
    }
    if (cmd === "bye" || cmd === "thanks" || cmd === "thank you") {
      return {
        html:
          "Bye, see ya later alligator. If you'd like the real Selene, she's at <a href='mailto:seleneltchan@gmail.com'>seleneltchan@gmail.com</a>.",
      };
    }

    const ranked = rank(input);
    const gap = findGap(input);

    if (gap && (!ranked.length || ranked[0].score < 2)) {
      return { html: GAPS.answer(gap), related: ranked.slice(0, 2).map((r) => r.cat) };
    }
    if (!ranked.length) {
      return {
        error: true,
        html:
          "! Rephrase your words, I match on keywords. Try <i>machine learning</i>, <i>React</i>, <i>venture capital</i> or <i>leadership</i>, or hit '^ help' for the full bank.",
      };
    }
    return { html: ranked[0].cat.answer, related: ranked.slice(1, 3).map((r) => r.cat) };
  }

  // Expose for testing in Node.
  if (typeof module !== "undefined") module.exports = { respond, rank };
  if (typeof document === "undefined") return;

  // ---------- UI ----------

  const log = document.getElementById("selLog");
  const form = document.getElementById("selForm");
  const input = document.getElementById("selInput");
  const helpBtn = document.getElementById("selHelpToggle");
  const helpPanel = document.getElementById("selHelp");
  const helpList = document.getElementById("selHelpList");
  if (!log || !form) return;

  function addBubble(who, html, opts = {}) {
    const row = document.createElement("div");
    row.className = "sel-row sel-row--" + who;

    const avatar = document.createElement("img");
    avatar.className = "sel-avatar";
    avatar.alt = who === "bot" ? "Sel" : "You";
    avatar.src = who === "bot" ? "assets/img/sel.jpg" : "assets/img/user.jpg";

    const bubble = document.createElement("div");
    bubble.className = "sel-bubble" + (opts.error ? " sel-bubble--error" : "");
    if (who === "user") bubble.textContent = html; // never trust typed input as HTML
    else bubble.innerHTML = html;

    if (opts.related && opts.related.length) {
      const more = document.createElement("div");
      more.className = "sel-related";
      more.append("Also related: ");
      opts.related.forEach((cat, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "sel-kw";
        const word = (cat.show || cat.keywords)[0];
        b.textContent = word;
        b.addEventListener("click", () => send(word));
        more.append(b);
        if (i < opts.related.length - 1) more.append(", ");
      });
      bubble.append(more);
    }

    if (who === "bot") row.append(avatar, bubble);
    else row.append(bubble, avatar);
    log.append(row);
    log.scrollTop = log.scrollHeight;
  }

  function send(text) {
    if (!text || !text.trim()) return;
    setHelp(false); // the panel gets out of the way once the visitor asks something
    addBubble("user", text.trim());
    const r = respond(text);
    addBubble("bot", r.html, { error: r.error, related: r.related });
    input.value = "";
    input.focus();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    send(input.value);
  });

  // Help panel: one short line per group. The keywords are italic and
  // clickable; the label is the plain description.
  GROUPS.forEach((group) => {
    const line = document.createElement("li");
    group.show.forEach((kw, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sel-kw";
      b.textContent = kw;
      b.addEventListener("click", () => send(kw));
      line.append(b);
      if (i < group.show.length - 1) line.append(", ");
    });
    const desc = document.createElement("span");
    desc.className = "sel-help-desc";
    desc.textContent = "  –  " + group.label;
    line.append(desc);
    helpList.append(line);
  });

  function setHelp(open) {
    helpPanel.classList.toggle("is-open", open);
    helpBtn.setAttribute("aria-expanded", String(open));
    helpPanel.setAttribute("aria-hidden", String(!open));
    helpBtn.querySelector(".sel-caret").textContent = open ? "v" : "^";
  }

  helpBtn.addEventListener("click", () => setHelp(!helpPanel.classList.contains("is-open")));
  addBubble(
    "bot",
    "Sup, I'm Sel, Selene's portfolio bot. Type a keyword a recruiter might look for, like <i>machine learning</i>, <i>React</i>, <i>leadership</i> or <i>GPA</i>, and I'll tell you where she's done it.<br><br>" +
      "No idea what to type? Hit the '^ help' button at the bottom left and I'll show you every keyword I understand."
  );
})();
