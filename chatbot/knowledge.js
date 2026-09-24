/*
 * Sel's knowledge: the recruiter keyword bank.
 *
 * Each category has
 *   - label:    shown in the "^ help" panel
 *   - keywords: lowercase words or phrases a recruiter might type
 *               (singular form; plurals are handled by the matcher)
 *   - group:    which help-panel line the category belongs to (see SEL_GROUPS)
 *   - show:     the keywords printed (and clickable) in the help panel
 *   - boost:    optional score multiplier for specific names (projects)
 *   - answer:   what Sel replies with. Plain HTML you control. Keep every
 *               claim traceable to the résumé, so the bot never oversells.
 *
 * To add a category, copy one block and edit it. Order matters only for
 * the help panel and for breaking ties (earlier wins).
 */

window.SEL_KNOWLEDGE = [
  {
    id: "about",
    group: "about",
    show: ["background", "summary"],
    label: "who she is",
    keywords: ["who", "summary", "background", "introduce", "introduction", "profile", "overview", "elevator pitch", "yourself"],
    answer:
      "Selene (Chan Lok Tung) is an AI undergraduate at the National University of Singapore on the Science &amp; Technology Undergraduate Scholarship, with minors in Data Analytics and Language Science. " +
      "This summer she completed Stanford's International Honors Program with a 4.0 GPA. " +
      "Her work sits where machine learning meets people: an autonomous ML research agent (TikTok TechJam), a clinical decision-support ensemble (Hack-Nation), a misinformation simulator (NUS Orbital), and aviation-AI research at Qiming Venture Partners.",
  },
  {
    id: "ml",
    group: "skills",
    show: ["machine learning", "neural network", "ensemble", "recommender"],
    label: "machine learning & modelling",
    keywords: [
      "machine learning", "ml", "model", "modelling", "modeling", "neural network", "deep learning",
      "optimization", "optimisation", "ensemble", "classification", "prediction", "predictive",
      "recommender", "recommendation", "ranking", "factorization machine", "scikit learn", "sklearn",
      "supervised", "training", "feature engineering", "ai",
    ],
    answer:
      "Three places to look. <b>TikTok TechJam 2026</b>: she built an agent that runs the ML research loop on its own and evaluated it against a Factorization Machine baseline on the KuaiRand-Pure short-video ranking benchmark. " +
      "<b>Hack-Nation 2026</b>: a three-model ensemble (male-only, female-only and mixed data) over ~3,700 patient records for PCOS and thyroid decisions. " +
      "<b>Coursework</b>: machine-learning optimisation at NUS, plus a Stanford research proposal on machine unlearning.",
  },
  {
    id: "llm",
    group: "skills",
    show: ["LLM", "AI agent", "RAG", "benchmarking"],
    label: "LLMs, agents & RAG",
    keywords: [
      "llm", "large language model", "language model", "agent", "agentic", "ai agent", "autonomous",
      "rag", "retrieval", "retrieval augmented generation", "prompt", "prompt engineering", "genai",
      "generative ai", "gen ai", "gpt", "gemini", "claude", "chatbot", "unlearning", "benchmark", "benchmarking", "evaluation", "eval",
    ],
    answer:
      "Selene works on LLMs from both the building and the research side. She built an <b>autonomous ML research agent</b> that forms hypotheses, patches its own code, runs optimisation loops and verifies results (TikTok TechJam 2026). " +
      "At Stanford she wrote a research proposal, <i>Savings in Relearning After Machine Unlearning</i>, asking whether language models relearn erased knowledge faster than they learn new knowledge. " +
      "At Unicorn Partners she argued the role of retrieval-augmented generation in personalising AI agents and studied how agent templates let non-technical experts build their own tools.",
  },
  {
    id: "data",
    group: "skills",
    show: ["data analysis", "statistics", "SQL", "MCDA"],
    label: "data & analytics",
    keywords: [
      "data", "data analysis", "data analytics", "analytics", "analysis", "statistics", "statistical", "probability",
      "pandas", "numpy", "sql", "r", "excel", "visualization", "visualisation", "dashboard", "metric",
      "quantitative", "a b testing", "dataset", "mcda", "multi criteria decision analysis",
    ],
    answer:
      "She's minoring in <b>Data Analytics</b> at NUS, with probability &amp; statistics and database systems in her coursework. " +
      "In practice: she assessed users' information-evaluation behaviour in EchoEcho with a <b>Multi-Criteria Decision Analysis</b> framework (decision accuracy, misinformation sharing, verification habits), " +
      "and she prepared two clinical cohorts for the Hack-Nation ensemble. As a numbers example from leadership, she raised AIESEC NUS's exchange participation rate from 19.2% to 23.8%.",
  },
  {
    id: "swe",
    group: "skills",
    show: ["full-stack", "React", "Python", "Java"],
    label: "software engineering & full-stack",
    keywords: [
      "software", "software engineering", "engineer", "developer", "full stack", "fullstack", "frontend", "front end",
      "backend", "back end", "web", "react", "react router", "javascript", "js", "typescript", "python", "java", "javafx",
      "flask", "api", "postgresql", "postgres", "database", "git", "github", "testing", "unit test", "junit",
      "gradle", "oop", "object oriented", "cytoscape", "coding", "programming", "programming language", "code",
    ],
    answer:
      "Languages: <b>Python, JavaScript, SQL and Java</b>. Frameworks and tools: React, React Router v7, Flask, PostgreSQL, Cytoscape.js, Git. " +
      "She shipped a React + PostgreSQL app for NUS Orbital, a Flask app with separate doctor and patient views for Hack-Nation, " +
      "and <a href='https://github.com/sel-couth-ene/ip' target='_blank' rel='noopener'>Sel</a>, a Java/JavaFX desktop chatbot with a test suite, Gradle build and crash-safe saving. " +
      "I'm the web version of that bot.",
  },
  {
    id: "research",
    group: "research",
    show: ["research", "experiment", "Stanford"],
    label: "research",
    keywords: [
      "research", "researcher", "experiment", "hypothesis", "paper", "literature review", "methodology", "method",
      "cognitive science", "stanford", "academic", "proposal", "machine unlearning", "savings", "relearning", "savings in relearning", "jensun", "symsys", "publication", "scientific", "phd",
    ],
    answer:
      "At Stanford (4.0 GPA) she studied modern research methods in cognitive science and design &amp; analysis of algorithms, and wrote a research proposal, <a href='assets/docs/Research_Proposal.pdf' target='_blank' rel='noopener'><i>Savings in Relearning After Machine Unlearning</i></a>. It asks whether language models relearn erased knowledge faster than when they learn new knowledge, using a learn, unlearn, intervene, relearn design with rollback and novel-fact controls. " +
      "In industry research at Qiming she reviewed published comparisons of neural-network versus Base of Aircraft Data (BADA) models for arrival-time prediction (66.3% more accurate, 96.9% confidence in prediction bounds). " +
      "Her TechJam agent automates the research loop itself.",
  },
  {
    id: "hci",
    group: "research",
    show: ["human-centred", "UX", "product"],
    label: "human-centered design & product",
    keywords: [
      "hci", "human computer interaction", "ux", "user experience", "ui", "design", "user research", "human centered",
      "human centred", "human in the loop", "product", "product management", "pm", "figma", "user testing",
      "usability", "accessibility", "stakeholder", "user",
    ],
    answer:
      "Human-centred thinking shows up in how she scopes products. In the Hack-Nation clinical app, doctors get alerted when patient-reported symptoms can't be confidently assessed or information is insufficient, so the clinician keeps the final call. " +
      "EchoEcho turns an abstract idea (how misinformation cascades) into something people can play with and see. " +
      "She also has a Language Science minor, which feeds how she thinks about people and AI talking to each other.",
  },
  {
    id: "responsible",
    group: "research",
    show: ["responsible AI", "bias", "healthcare", "explainable"],
    label: "responsible AI, safety & healthcare",
    keywords: [
      "responsible ai", "ethics", "ethical", "fairness", "bias", "safety", "ai safety", "trust", "trustworthy",
      "explainable", "explainability", "xai", "interpretability", "healthcare", "health", "clinical", "medical",
      "women", "misinformation", "regulation", "risk",
    ],
    answer:
      "Her Hack-Nation team, <i>Artificially Unintelligent</i>, started from a bias problem: generic clinical models can underrepresent women's hormonal health, so they split training into male-only, female-only and mixed data and combined the three. " +
      "The app escalates to a doctor rather than guessing. At Qiming she examined the risks of applying digital twins and User-Centric Explainable AI to air traffic control. " +
      "<a href='https://abiibass.github.io/AbiramiBaskaranPortfolio/assets/img/portfolio/HackNation/artificially_unintelligent.html' target='_blank' rel='noopener'>See the Hack-Nation showcase</a>.",
  },
  {
    id: "venture",
    group: "experience",
    show: ["work experience", "venture capital", "market research"],
    label: "work experience, venture & strategy",
    keywords: [
      "experience", "work experience", "worked", "work for", "intern", "internship", "employer", "company", "venture", "venture capital", "vc", "investment", "investing", "investor", "due diligence", "market",
      "market research", "market sizing", "strategy", "consulting", "competitive analysis", "swot", "business",
      "finance", "fintech", "aviation", "air traffic", "qiming", "unicorn partners", "startup",
    ],
    answer:
      "Two research internships in Hong Kong in 2025. At <b>Qiming Venture Partners</b> she identified the Middle East as aerospace AI's fastest-growing market (9.31% forecast CAGR), profiled two air-traffic-control vendors (TCT, 688015.SH, and the startup NoamAI) and examined risks in digital twins and explainable AI for ATC. " +
      "At <b>Unicorn Partners</b> she analysed the products launched at Google I/O 2025 and what they meant for stakeholder adoption.",
  },
  {
    id: "leadership",
    group: "experience",
    show: ["leadership", "teamwork", "AIESEC"],
    label: "leadership & teamwork",
    keywords: [
      "leadership", "leader", "lead", "manage", "management", "team", "teamwork", "collaboration", "collaborate",
      "communication", "presentation", "public speaking", "cross cultural", "aiesec", "initiative", "mentor",
      "ownership", "soft skill", "vice president", "vp",
    ],
    answer:
      "Since January 2026 she has been <b>Vice President, Outgoing Global Exchange at AIESEC in NUS</b>, leading a 16-person committee that helps students reach volunteering and internship placements in 15 countries. " +
      "Her targeted campaigns raised the participation rate from 19.2% to 23.8%. Every project on this site was also a team build under hackathon or programme deadlines.",
  },
  {
    id: "hackathon",
    group: "projects",
    show: ["hackathon", "prototype"],
    label: "hackathons & shipping fast",
    keywords: [
      "hackathon", "prototype", "ship", "shipping",
      "deadline", "fast", "pressure", "award", "achievement", "orbital", "competition",
    ],
    answer:
      "Three builds in summer 2026: <b>TikTok TechJam</b> (Aug, Singapore) with the autonomous ML research agent; <b>Hack-Nation 6th Global AI Hackathon</b> (Jul, US) with the women's hormonal-health ensemble; and <b>NUS Orbital</b> (May–Aug), where EchoEcho earned a <b>Second-Tier Achievement</b>.",
  },
  {
    id: "projects",
    group: "projects",
    show: ["projects"],
    keywords: ["project", "projects", "portfolio", "built", "build", "side project", "sel bot", "java chatbot"],
    answer:
      "Five projects, newest first: an <b>Autonomous Machine Learning Research Agent for Recommender Systems</b> (TikTok TechJam, Aug 2026); an <b>Ensemble Model for Clinical Decision Support in Women’s Hormonal Health</b> (Hack Nation, Jul 2026); " +
      "<b>EchoEcho</b>, a Social Network Simulation of Misinformation Spread (NUS Orbital, May – Aug 2026, Second-Tier Achievement); a Stanford research proposal, <a href='assets/docs/Research_Proposal.pdf' target='_blank' rel='noopener'><b>Savings in Relearning After Machine Unlearning</b></a> (Summer 2026); and " +
      "<a href='https://github.com/sel-couth-ene/ip' target='_blank' rel='noopener'>Sel</a>, a Java/JavaFX task chatbot. Type a project name for detail.",
  },
  {
    id: "echoecho",
    group: "projects",
    show: ["EchoEcho", "graph"],
    boost: 2,
    label: "EchoEcho project",
    keywords: ["echoecho", "echo echo", "echo chamber", "social network", "simulation", "graph", "independent cascade", "icm", "network"],
    answer:
      "EchoEcho models misinformation spread with an <b>Independent Cascade Model</b> over a directed graph. Activation probability depends on the information's virality, weights on user actions, and each node's susceptibility. " +
      "It then scores how people evaluate information using multi-criteria decision analysis. Built with React, React Router v7, PostgreSQL and Cytoscape.js; awarded Second-Tier Achievement at NUS Orbital 2026. " +
      "<a href='https://github.com/valeriecyz/EchoEcho' target='_blank' rel='noopener'>GitHub</a>, <a href='https://drive.google.com/file/d/1s755XXHOslDFtVwi4pGzlPBpIebBDlbU/view' target='_blank' rel='noopener'>poster</a>, <a href='https://drive.google.com/file/d/16dJI5v2xm4ugmuRKmru8CUXKToZW5ufk/view' target='_blank' rel='noopener'>documentation</a>, <a href='https://drive.google.com/file/d/1xFhQJHyDDwsNLTLH_EeXrGpKmWxSB0M3/view' target='_blank' rel='noopener'>demo video</a>.",
  },
  {
    id: "techjam",
    group: "projects",
    show: ["TechJam", "KuaiRand"],
    boost: 2,
    label: "TikTok TechJam research agent",
    keywords: ["techjam", "tiktok", "kuairand", "research agent", "recommender system", "short video"],
    answer:
      "For TikTok TechJam 2026 (Singapore) Selene built an AI agent that runs the full ML research loop by itself: it forms a hypothesis, patches its own code, runs iterative optimisation, verifies the result, then forms the next hypothesis. " +
      "She evaluated it against a Factorization Machine baseline on KuaiRand-Pure, a short-video ranking benchmark. " +
      "<a href='https://github.com/RayWHJ/TikTokTechJam' target='_blank' rel='noopener'>GitHub</a> and <a href='https://devpost.com/software/swe-hell' target='_blank' rel='noopener'>Devpost details</a>.",
  },
  {
    id: "hacknation",
    group: "projects",
    show: ["Hack-Nation", "PCOS"],
    boost: 2,
    label: "Hack Nation clinical ensemble",
    keywords: ["hack nation", "hacknation", "artificially unintelligent", "pcos", "thyroid", "hormonal", "women s health", "clinical decision support"],
    answer:
      "At the 6th Hack-Nation Global AI Hackathon, team <i>Artificially Unintelligent</i> built a three-model ensemble (male-only, female-only and mixed data) over ~3,700 patient records for PCOS and thyroid decisions, " +
      "wrapped in a Flask app with separate doctor and patient views, report upload, AI summaries and records shared across hospitals. Doctors are alerted whenever symptoms can't be assessed confidently. " +
      "<a href='https://abiibass.github.io/AbiramiBaskaranPortfolio/assets/img/portfolio/HackNation/artificially_unintelligent.html' target='_blank' rel='noopener'>Project showcase</a>.",
  },
  {
    id: "education",
    group: "about",
    show: ["GPA", "NUS", "scholarship"],
    label: "education & GPA",
    keywords: [
      "education", "degree", "university", "school", "gpa", "grade", "nus", "national university of singapore",
      "scholarship", "scholar", "coursework", "course", "minor", "major", "graduate", "graduation", "student", "class of",
    ],
    answer:
      "<b>National University of Singapore</b>, Bachelor of Computing in Artificial Intelligence (Aug 2025 – present), minors in Data Analytics and Language Science, GPA 4.3/5.0, on the Science &amp; Technology Undergraduate Scholarship. " +
      "Coursework includes ML optimisation, database systems, software engineering, and probability &amp; statistics. " +
      "<b>Stanford University</b>, International Honors Program, Jun–Aug 2026, GPA 4.0/4.0.",
  },
  {
    id: "languages",
    group: "about",
    show: ["Mandarin", "Cantonese"],
    label: "spoken languages",
    keywords: ["language", "english", "cantonese", "mandarin", "chinese", "bilingual", "trilingual", "multilingual", "speak", "spoken language", "fluent"],
    answer: "English, Cantonese and Mandarin, all at native proficiency.",
  },
  {
    id: "contact",
    group: "contact",
    show: ["contact", "hire", "résumé"],
    label: "availability & contact",
    keywords: [
      "contact", "email", "phone", "whatsapp", "reach", "hire", "hiring", "available", "availability",
      "job", "role", "opportunity", "open to", "location", "based", "singapore", "hong kong", "relocate",
      "visa", "work authorization", "start date", "resume", "cv", "linkedin",
    ],
    answer:
      "Selene is based in Singapore and Hong Kong and is open to AI/ML research, AI product and engineering roles. " +
      "Email <a href='mailto:seleneltchan@gmail.com'>seleneltchan@gmail.com</a> or her NUS address <a href='mailto:e1718635@u.nus.edu'>e1718635@u.nus.edu</a>, call +65 8964 7047 or WhatsApp +852 5973 3021, or find her on <a href='https://www.linkedin.com/in/sel-ene/' target='_blank' rel='noopener'>LinkedIn</a>. " +
      "For start dates and work authorisation, ask her directly. <a href='assets/docs/Selene_Chan_Resume.pdf' target='_blank'>Download Resume (PDF)</a>.",
  },
];

/*
 * Keywords recruiters often search for that are NOT on Selene's résumé.
 * Sel answers these honestly instead of pretending, and points to the
 * closest real experience. Remove a word from here once it's true.
 */
window.SEL_GAPS = {
  keywords: [
    "pytorch", "tensorflow", "keras", "jax", "aws", "gcp", "azure", "cloud", "docker", "kubernetes",
    "c++", "cpp", "c#", "rust", "golang", "spark", "hadoop", "tableau", "power bi", "mlops",
    "computer vision", "reinforcement learning", "rl", "cuda",
  ],
  answer: (word) =>
    "Selene hasn't listed <i>" + word + "</i> on her résumé, so I won't claim it. " +
    "The closest thing she has done: Python ML work (a three-model ensemble, an autonomous research agent benchmarked on KuaiRand-Pure) and full-stack builds in React, Flask and PostgreSQL. " +
    "Email <a href='mailto:seleneltchan@gmail.com'>seleneltchan@gmail.com</a> to ask where she is with it.",
};

/*
 * The "^ help" panel shows only these few lines. Every category above still
 * answers its own keywords; groups just keep the panel short.
 */
window.SEL_GROUPS = [
  { id: "about", label: "who she is, education, languages", show: ["background", "GPA", "languages"] },
  { id: "skills", label: "technical skills", show: ["machine learning", "RAG", "Python", "data analysis"] },
  { id: "projects", label: "what she has built", show: ["projects", "TechJam", "Hack-Nation", "EchoEcho"] },
  { id: "experience", label: "internships and leadership", show: ["work experience", "venture capital", "leadership"] },
  { id: "research", label: "research and responsible AI", show: ["research", "healthcare", "explainable"] },
  { id: "contact", label: "availability and contact", show: ["contact", "hire", "résumé"] },
];
