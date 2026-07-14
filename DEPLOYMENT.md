# Deploying Selene's self-hosted assistant on Oracle Cloud

Covers: Oracle account + VM setup, Ollama server config, security/HTTPS, and
end-to-end testing. Assumes you've already run `train.py` in Colab and have
`selene-gguf/*.gguf` downloaded locally, and that `training_data.jsonl` /
`Modelfile` / `chat.js` are updated (see the other files in this project).

**Important, read first:** As of mid-2026, Oracle's Always Free Ampere A1
allocation is **2 OCPU / 12GB RAM**, not the 4 OCPU / 24GB you may see in
older guides — Oracle quietly halved it. Everything below targets 2/12GB.
A Q4_K_M-quantized Phi-4-mini-instruct (~2.2-2.5GB) fits this comfortably.

---

## 1. Oracle Cloud account + VM setup

### Sign up
1. Go to [cloud.oracle.com](https://www.oracle.com/cloud/free/) and start account creation.
2. You'll be asked for a credit/debit card. This is **identity verification only**
   — Oracle places a small temporary authorization hold (varies by region, typically
   under $1-2 USD equivalent) that is automatically released within a few days.
   It does **not** enroll you in a paid plan and does **not** charge you for
   Always Free resources. You will not be silently upgraded to Pay-As-You-Go —
   that requires an explicit action on your part later. Some prepaid/virtual
   cards get rejected by Oracle's verification; a normal debit or credit card
   works best.
3. Pick a **home region** during signup carefully — this is permanent for your
   tenancy's Always Free resources and can't be changed later without opening
   a new account. See region choice below.

### Choosing a region
Ampere A1 capacity is inconsistent by region — some regions frequently show
"Out of host capacity" for the free shape. As of recent reports, **Frankfurt
(eu-frankfurt-1)**, **Singapore (ap-singapore-1)**, and **Tokyo (ap-tokyo-1)**
tend to provision within minutes; US regions are more often capacity-constrained.
Given Selene is based in Hong Kong/Singapore, **Singapore** is both usually-available
and lowest-latency for her and likely for most site visitors in that region — a
reasonable default choice.

### Provision the VM
1. Console -> **Compute -> Instances -> Create Instance**.
2. **Image**: Ubuntu (22.04 or 24.04) — Always Free eligible, well-supported by Ollama.
3. **Shape**: click "Change shape" -> Ampere -> `VM.Standard.A1.Flex`. Set
   **2 OCPUs / 12 GB memory** (the current Always Free ceiling — going higher
   will either fail or, if you've enabled PAYG, start billing you).
4. **Networking**: use the default VCN/subnet, and check "Assign a public IPv4 address."
5. **SSH keys**: generate a new key pair in the console (or paste your own public key)
   and save the private key somewhere safe — you cannot re-download it later.
6. Click **Create**. If you hit "Out of host capacity," just retry the create button
   every few minutes, or try a nearby region.

### Networking / security list (opening a port)
By default, only SSH (port 22) is open. You need to open the port Caddy will use for HTTPS.
1. Console -> **Networking -> Virtual Cloud Networks** -> your VCN -> your subnet ->
   **Security Lists** -> default security list.
2. **Add Ingress Rule**:
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: TCP
   - Destination Port Range: `443` (for HTTPS via Caddy)
   - Add a second rule for `80` too (Caddy needs it briefly for the Let's Encrypt
     ACME challenge, even though it redirects everything to 443 afterward).
3. Do **not** open 11434 (Ollama's raw port) to `0.0.0.0/0`. Ollama has no auth of
   its own — only Caddy, sitting in front of it, should be internet-facing. Ollama
   should only listen on `localhost` (see below) so this is enforced at two layers.
4. Ubuntu's own firewall (`iptables`/`ufw`) is separate from Oracle's security
   list and also blocks by default on the stock image — you'll open 80/443 there too
   in the server setup step.

---

## 4. Server setup: Ollama, the model, and persistence

SSH in first: `ssh -i /path/to/your/key ubuntu@<VM_PUBLIC_IP>`

### Install Ollama
```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl status ollama   # installer already sets up and starts a systemd service
```
Ollama's installer sets up its own systemd unit by default (`ollama.service`), so
persistence across reboots is already handled — you don't need to write your own
unit file for Ollama itself. Confirm it's enabled:
```bash
sudo systemctl is-enabled ollama   # should print "enabled"
```

By default, Ollama binds to `127.0.0.1:11434` (localhost only) — this is what
you want, since Caddy (not the open internet) should be the only thing that
can reach it. Do not set `OLLAMA_HOST=0.0.0.0` unless you fully understand
the exposure — leave it at the default.

### Transfer the GGUF and build the model
From your local machine (where you downloaded `selene-gguf/*.gguf` from Colab):
```bash
scp -i /path/to/your/key -r selene-gguf/ ubuntu@<VM_PUBLIC_IP>:~/
scp -i /path/to/your/key Modelfile ubuntu@<VM_PUBLIC_IP>:~/
```
Back on the VM:
```bash
# Check the exact filename Unsloth produced — it's not guaranteed to be
# literally "unsloth.Q4_K_M.gguf"; list the folder and fix the Modelfile's
# FROM line to match if needed.
ls ~/selene-gguf/

ollama create selene-assistant -f ~/Modelfile
ollama run selene-assistant "What did Selene do at Qiming Venture Partners?"   # sanity check
```

### Keep the model warm (avoid cold-start latency)
Ollama unloads a model from memory after 5 minutes of inactivity by default,
and reloading a ~2.5GB GGUF on 2 CPU cores takes real time — long enough to
risk hitting the Vercel function timeout on a visitor's first message after
a quiet period. Set a longer keep-alive as an environment variable for the
Ollama service:
```bash
sudo systemctl edit ollama
```
Add:
```ini
[Service]
Environment="OLLAMA_KEEP_ALIVE=1h"
```
Then:
```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```
This trades a small amount of always-on RAM for consistently fast responses —
worth it given you already have 12GB and the model only needs ~2.5-3GB loaded.

---

## 5. Security: auth, rate limiting, HTTPS

Ollama has no built-in authentication or rate limiting, so both need to live
in front of it. **Caddy** is a good fit here: automatic free HTTPS certs (via
Let's Encrypt) and simple reverse-proxy config in one binary, no separate
cert-renewal cron job to maintain.

### Install Caddy
```bash
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```
(The installer sets up its own systemd unit too — persistence is handled.)

### Point a domain at the VM
You need a real domain (or subdomain) pointed at the VM's public IP via an A
record — Let's Encrypt won't issue a cert for a bare IP address. If you don't
want to buy a domain, a free subdomain provider (e.g. a DDNS service) works,
or a subdomain of `selenechan.dev` if you control that DNS already (e.g.
`ai-backend.selenechan.dev`).

### Configure the Caddyfile — auth + reverse proxy
Edit `/etc/caddy/Caddyfile`:
```caddyfile
ai-backend.yourdomain.com {
    @authorized {
        header X-Api-Key "REPLACE_WITH_A_LONG_RANDOM_SECRET"
    }
    @unauthorized {
        not header X-Api-Key "REPLACE_WITH_A_LONG_RANDOM_SECRET"
    }

    handle @unauthorized {
        respond "Unauthorized" 401
    }

    handle @authorized {
        reverse_proxy localhost:11434
    }
}
```
Generate the secret once (e.g. `openssl rand -hex 32`) and use the *same* value
here and in Vercel's `OLLAMA_API_SECRET` env var. This is what stops the endpoint
being wide open — anyone without the header gets a 401 before Ollama ever sees
the request.

For basic rate limiting, Caddy's core doesn't ship one built-in, but the
[`caddy-ratelimit`](https://github.com/mholt/caddy-ratelimit) plugin is simple
to add if abuse becomes a real problem in practice. Given this is a low-traffic
personal-site chatbot behind a secret header already, start without it and add
it only if you actually see abusive traffic in the logs — no need to over-engineer
this on day one.

```bash
sudo systemctl reload caddy
```

### Open 80/443 on the VM's own firewall
Oracle's security list (step 1) only controls traffic at the cloud-network level;
Ubuntu's local firewall is separate:
```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save   # if installed; otherwise these rules won't survive reboot — check `sudo ufw status` too, some Ubuntu images use ufw instead
```

---

## 7. Testing plan (end to end)

Test the chain in order — each step isolates a different link, so if
something's broken you know immediately where:

1. **VM reachable at all** (network + Caddy):
   ```bash
   curl -I https://ai-backend.yourdomain.com
   ```
   Expect `401 Unauthorized` (no header sent) — this confirms Caddy is up, HTTPS
   works, and the auth rule is active. If this times out or connection-refuses:
   check Oracle security list rules, then `sudo systemctl status caddy` on the VM.

2. **Ollama responding through Caddy** (with the correct header):
   ```bash
   curl https://ai-backend.yourdomain.com/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "X-Api-Key: <your-secret>" \
     -d '{"model":"selene-assistant","messages":[{"role":"user","content":"What did Selene study?"}]}'
   ```
   Expect a normal OpenAI-shaped JSON response with `choices[0].message.content`.
   If you get a 401: secret mismatch between curl and the Caddyfile. If you get
   a 502/504: Ollama itself may be down — check `sudo systemctl status ollama`
   and `ollama list` on the VM directly.

3. **Vercel proxy relaying correctly**: hit your deployed `/api/chat` route directly
   with curl (same shape the frontend sends):
   ```bash
   curl https://yoursite.com/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"What did Selene study?"}]}'
   ```
   Expect `{"reply": "..."}`. If this fails but step 2 worked: check Vercel's
   function logs (`vercel logs` or the dashboard) — likely a missing/misnamed
   environment variable (`OLLAMA_ENDPOINT`, `OLLAMA_MODEL`, `OLLAMA_API_SECRET`).

4. **Frontend chat widget on the live site**: open the deployed site, open
   browser dev tools -> Network tab, send a message in the chat widget, and confirm
   the request to `/api/chat` succeeds and the response renders. If the API
   calls in step 3 work but this doesn't: check the browser console for CORS
   errors (`ALLOWED_ORIGIN` env var not matching your actual deployed domain
   is the most likely cause).

**If something breaks after this is all working (not just during setup):**
- First response after a while is slow/times out -> check `OLLAMA_KEEP_ALIVE`
  actually took effect (`sudo systemctl show ollama | grep KEEP_ALIVE`), and
  whether the VM was possibly reclaimed for inactivity (Console -> Instances ->
  check state).
- Everything 401s suddenly -> secret was rotated in one place but not the other
  (Caddyfile vs. Vercel env var).
- Responses are nonsensical or off-brand -> that's a model/training issue,
  not an infra issue — revisit `training_data.jsonl` quality/coverage rather
  than the deployment.
