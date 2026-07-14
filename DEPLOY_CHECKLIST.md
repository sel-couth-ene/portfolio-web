# Deployment checklist — Selene's self-hosted AI assistant

Follow in order. Files referenced are all in this delivery.

## Phase A — Generate the training data
- [ ] **A1.** Run `python3 generate_training_data.py > training_data.jsonl`
      locally if you want to tweak/add more Q&A pairs first (edit the `add([...])`
      blocks, then regenerate). Otherwise the `training_data.jsonl` provided is
      ready to use as-is (151 examples).
- [ ] **A2.** Sanity-check it's valid JSONL:
      `python3 -c "import json;[json.loads(l) for l in open('training_data.jsonl')]"`
      (no output = all good).

## Phase B — Fine-tune the model (Google Colab, free T4 GPU)
- [ ] **B1.** Open [colab.research.google.com](https://colab.research.google.com),
      new notebook, **Runtime → Change runtime type → T4 GPU**.
- [ ] **B2.** Upload `training_data.jsonl` to the Colab session (sidebar → Files → upload).
- [ ] **B3.** Paste the contents of `train.py` into a cell and run it (or upload
      `train.py` and run `!python train.py`). Takes roughly 10-25 minutes.
- [ ] **B4.** Confirm it finished: you should see `./selene-lora/` and `./selene-gguf/`
      folders appear in the Colab file browser.
- [ ] **B5.** **Download the `.gguf` file** from `./selene-gguf/` to your local
      machine before the Colab session ends/disconnects — it is not saved anywhere
      once the runtime resets.
- [ ] **B6.** Note the exact filename you downloaded (e.g. `unsloth.Q4_K_M.gguf` or
      similar) — you'll need it in Phase D.

## Phase C — Oracle Cloud account + VM
- [ ] **C1.** Sign up at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/).
      Card verification is a temporary hold, not a charge — see `DEPLOYMENT.md` §1.
- [ ] **C2.** Choose home region: **Singapore (ap-singapore-1)** recommended
      (good capacity availability + low latency for HK/SG traffic) — see
      `DEPLOYMENT.md` §1 for alternatives if it's out of capacity.
- [ ] **C3.** Create the instance: Ubuntu 22.04/24.04, shape `VM.Standard.A1.Flex`,
      **2 OCPU / 12GB RAM** (the current Always Free ceiling), public IPv4 assigned,
      SSH key saved locally.
- [ ] **C4.** Open ports 80 and 443 in the VCN's default **Security List**
      (Networking → Virtual Cloud Networks → your VCN → Security Lists). Do
      **not** open 11434 publicly.
- [ ] **C5.** Point a domain or subdomain's DNS **A record** at the VM's public IP
      (needed for HTTPS in Phase D — Let's Encrypt won't issue certs for a bare IP).

## Phase D — Server setup (Ollama + Caddy)
SSH in: `ssh -i /path/to/key ubuntu@<VM_PUBLIC_IP>`
- [ ] **D1.** Install Ollama: `curl -fsSL https://ollama.com/install.sh | sh`
      (sets up its own systemd service automatically).
- [ ] **D2.** From your local machine, transfer the model + Modelfile:
      `scp -i /path/to/key -r selene-gguf/ ubuntu@<VM_IP>:~/`
      `scp -i /path/to/key Modelfile ubuntu@<VM_IP>:~/`
- [ ] **D3.** On the VM: `ls ~/selene-gguf/` and fix the `FROM` line in `Modelfile`
      if the filename doesn't match what's actually there.
- [ ] **D4.** Build and test the model:
      `ollama create selene-assistant -f ~/Modelfile`
      `ollama run selene-assistant "What did Selene study?"` — confirm a sane answer.
- [ ] **D5.** Set a long keep-alive so the model doesn't unload between visitors:
      `sudo systemctl edit ollama` → add `Environment="OLLAMA_KEEP_ALIVE=1h"` →
      `sudo systemctl daemon-reload && sudo systemctl restart ollama`.
- [ ] **D6.** Install Caddy (see `DEPLOYMENT.md` §5 for the exact commands).
- [ ] **D7.** Generate a secret: `openssl rand -hex 32` — save it, you need it twice
      (Caddyfile now, Vercel env var in Phase E).
- [ ] **D8.** Edit `/etc/caddy/Caddyfile` with your domain + that secret (template
      is in `DEPLOYMENT.md` §5), then `sudo systemctl reload caddy`.
- [ ] **D9.** Open 80/443 on the VM's own local firewall too (Oracle's security
      list in C4 is separate from this) — see `DEPLOYMENT.md` §5.

## Phase E — Update and deploy the Vercel site
- [ ] **E1.** Replace your project's `api/chat.js` with the updated `chat.js` provided.
- [ ] **E2.** In Vercel → Project Settings → Environment Variables, set:
      - `OLLAMA_ENDPOINT` = `https://your-domain.example.com/v1/chat/completions`
      - `OLLAMA_MODEL` = `selene-assistant`
      - `OLLAMA_API_SECRET` = the same secret from D7
      - `ALLOWED_ORIGIN` = your real deployed site URL (e.g. `https://selenechan.dev`)
- [ ] **E3.** Deploy (`git push` if auto-deploy is set up, or `vercel --prod`).
- [ ] **E4.** `script.js` and `index.html` need **no changes** — the response
      shape (`{reply}`) is unchanged.

## Phase F — Test end-to-end (do these in order)
- [ ] **F1.** `curl -I https://your-domain.example.com` → expect `401 Unauthorized`
      (confirms Caddy + HTTPS are up).
- [ ] **F2.** `curl` the same URL's `/v1/chat/completions` with the `X-Api-Key`
      header and a test message → expect a real model response. (Exact command
      in `DEPLOYMENT.md` §7, step 2.)
- [ ] **F3.** `curl` your live `https://yoursite.com/api/chat` directly → expect
      `{"reply": "..."}`.
- [ ] **F4.** Open the live site, use the chat widget in the browser, confirm it
      works end-to-end.
- [ ] **F5.** If anything breaks, `DEPLOYMENT.md` §7 has a "what to check" list
      matched to each failure point in this chain.

---
**File map** — what each delivered file is for:
| File | Used in phase | Purpose |
|---|---|---|
| `generate_training_data.py` | A | Produces `training_data.jsonl` from templated paraphrase groups |
| `training_data.jsonl` | B | Fine-tuning dataset, upload to Colab |
| `train.py` | B | Colab fine-tuning script (Phi-4-mini-instruct + LoRA + GGUF export) |
| `Modelfile` | D | Packages the GGUF for Ollama (`ollama create`) |
| `chat.js` | E | Replaces your Vercel `api/chat.js`, proxies to the Oracle VM |
| `DEPLOYMENT.md` | C, D, E, F | Full command-by-command detail behind every checklist item above |
