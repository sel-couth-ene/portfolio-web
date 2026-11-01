# Selene Chan · portfolio

Static portfolio site with **Sel**, a keyword chatbot for recruiters. No build step, no server, no API key, so it runs on GitHub Pages as-is.

## Deploy on GitHub Pages

1. Create a repo (for a root URL, name it `sel-couth-ene.github.io`).
2. Push everything in this folder to the `main` branch:
   ```
   git init
   git add .
   git commit -m "Portfolio v3"
   git branch -M main
   git remote add origin https://github.com/sel-couth-ene/<repo-name>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / root**.
4. The site appears at `https://sel-couth-ene.github.io/<repo-name>/` within a minute or two.

It also deploys to Vercel unchanged (import the repo, framework preset "Other").

To preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000.

## Files

```
index.html               home (one screen)
experience.html          Work Experience: Qiming, Unicorn Partners, AIESEC, NUSSU
projects.html            Projects: SAF Supply Chain, TechJam, Hack Nation, EchoEcho, Savings in Relearning, Sel
about.html               About Me: education and skills
ask.html                 Sel chatbot
style.css                design (palette, type, one-screen layouts, chat window)
script.js                mobile menu
chatbot/knowledge.js     the keyword bank and Sel's answers  ← edit this to update the bot
chatbot/sel.js           matching engine + chat UI
assets/img/sel.jpg       Sel's avatar (from the ip repo)
assets/img/user.jpg      visitor avatar (from the ip repo)
assets/docs/Selene_Chan_Resume.pdf
assets/docs/Research_Proposal.pdf
.nojekyll                tells GitHub Pages to serve files untouched
```

The previous OpenAI proxy (`api/chat.js`), the fine-tuning files (`train.py`, `training_data.jsonl`, `Modelfile`) and `package.json` are no longer needed. If they're still in your repo, delete them, and revoke the `OPENAI_API_KEY` on Vercel if you set one.

## How Sel works

Sel follows the Sel desktop app ([sel-couth-ene/ip](https://github.com/sel-couth-ene/ip)): avatar and bordered bubble for each message, a light-red bubble starting with `!` when nothing matches, and a `^ help` button that slides the keyword list up from the input bar.

1. The visitor's text is lowercased, accents and punctuation are stripped, and plurals are reduced (`agents` → `agent`).
2. Every category scores one point per word of each keyword it contains, so `responsible ai` (2) beats a bare `ai` (1). Project names have `boost: 2`.
3. The top category answers; the next two are offered as clickable "Also related" keywords.
4. Keywords recruiters search for that are **not** on the résumé (PyTorch, AWS, Docker…) get an honest "not listed" reply that points to the closest real experience.
5. `help`, `list`, `hi`, `bye` work as commands.

To add a keyword, append it to the right `keywords` array in `chatbot/knowledge.js`. To add a skill you've since learned, remove it from `SEL_GAPS` and add it to a category's answer.

## Keyword bank

The `^ help` panel shows six groups (`SEL_GROUPS` in `chatbot/knowledge.js`): who she is, technical skills, what she has built, internships and leadership, research and responsible AI, availability and contact. Behind them, every keyword below still gets its own specific answer.

| Category | Keywords Sel recognises |
| :-- | :-- |
| who she is | who, summary, background, introduce, introduction, profile, overview, elevator pitch, yourself |
| machine learning & modelling | machine learning, ml, model, modelling, modeling, neural network, deep learning, optimization, optimisation, ensemble, classification, prediction, predictive, recommender, recommendation, ranking, factorization machine, scikit learn, sklearn, supervised, training, feature engineering, ai |
| LLMs, agents & RAG | llm, large language model, language model, agent, agentic, ai agent, autonomous, rag, retrieval, retrieval augmented generation, prompt, prompt engineering, genai, generative ai, gen ai, gpt, gemini, claude, chatbot, unlearning, benchmark, benchmarking, evaluation, eval |
| data & analytics | data, data analysis, data analytics, analytics, analysis, statistics, statistical, probability, pandas, numpy, sql, r, excel, visualization, visualisation, dashboard, metric, quantitative, a b testing, dataset, mcda, multi criteria decision analysis |
| software engineering & full-stack | software, software engineering, engineer, developer, full stack, fullstack, frontend, front end, backend, back end, web, react, react router, javascript, js, typescript, python, java, javafx, flask, api, postgresql, postgres, database, git, github, testing, unit test, junit, gradle, oop, object oriented, cytoscape, coding, programming, programming language, code |
| research | research, researcher, experiment, hypothesis, paper, literature review, methodology, method, cognitive science, stanford, academic, proposal, publication, scientific, phd |
| human-centered design & product | hci, human computer interaction, ux, user experience, ui, design, user research, human centered, human centred, human in the loop, product, product management, pm, figma, user testing, usability, accessibility, stakeholder, user |
| responsible AI, safety & healthcare | responsible ai, ethics, ethical, fairness, bias, safety, ai safety, trust, trustworthy, explainable, explainability, xai, interpretability, healthcare, health, clinical, medical, women, misinformation, regulation, risk |
| work experience, venture & strategy | experience, work experience, worked, work for, intern, internship, employer, company, venture, venture capital, vc, investment, investing, investor, due diligence, market, market research, market sizing, strategy, consulting, competitive analysis, swot, business, finance, fintech, aviation, air traffic, qiming, unicorn partners, startup |
| leadership & teamwork | leadership, leader, lead, manage, management, team, teamwork, collaboration, collaborate, communication, presentation, public speaking, cross cultural, aiesec, initiative, mentor, ownership, soft skill, vice president, vp, nussu, student union, business committee, deputy director, director, sponsor, sponsorship, partnership, corporate partnership, event, event management, budget, budgeting |
| hackathons & shipping fast | hackathon, prototype, ship, shipping, deadline, fast, pressure, award, achievement, orbital, competition |
| all projects | project, projects, portfolio, built, build, side project, financeasy, cryptocurrency, crypto, pyside, sel bot, java chatbot |
| SAF supply chain optimisation | saf, sustainable aviation fuel, aviation fuel, supply chain, airbus, autonomoussg, autonomous sg, milp, mixed integer linear programming, mixed integer, linear programming, integer programming, operations research, pulp, highs, kalimantan, biomass, refinery, refineries, depot, streamlit, logistics, facility location, network optimisation, network optimization, optimality gap |
| EchoEcho project | echoecho, echo echo, echo chamber, social network, simulation, graph, independent cascade, icm, network |
| TikTok TechJam research agent | techjam, tiktok, kuairand, research agent, recommender system, short video |
| Hack-Nation clinical ensemble | hack nation, hacknation, artificially unintelligent, pcos, thyroid, hormonal, women s health, clinical decision support |
| education & GPA | education, degree, university, school, gpa, grade, nus, national university of singapore, scholarship, scholar, coursework, course, minor, major, graduate, graduation, student, class of |
| spoken languages | english, cantonese, mandarin, chinese, bilingual, trilingual, multilingual, speak, spoken language, fluent |
| availability & contact | contact, email, phone, whatsapp, reach, hire, hiring, available, availability, job, role, opportunity, open to, location, based, singapore, hong kong, relocate, visa, work authorization, start date, resume, cv, linkedin |
| honest gaps (not on résumé) | pytorch, tensorflow, keras, jax, aws, gcp, azure, cloud, docker, kubernetes, c++, cpp, c#, rust, golang, spark, hadoop, tableau, power bi, mlops, computer vision, reinforcement learning, rl, cuda |

## Design notes

- Colours: background `#f5eee9`, bold text and navy blocks `#2F4156`, text on navy `#F5EFEB`. Body copy on the light background uses a lighter navy (`#4d5b6d`), because `#F5EFEB` on `#f5eee9` would be invisible.
- Type: Bitter for headings, Open Sans for body text, Source Sans 3 (the current name of Source Sans Pro) for navigation, labels, buttons and the chat window. All load from Google Fonts.
- Each page fits one desktop screen: the header and footer take fixed height and the content area fills the rest. Tested with no scrolling at 1280×720, 1366×768, 1440×900 and 1920×1080. Below 900px wide, columns stack and pages scroll normally, since five projects can't fit a phone screen legibly.
