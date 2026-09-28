# SMC Liquidity Hunting AI Lab — Signal Dashboard

Bilingual (English/বাংলা) static dashboard for institutional SMC Forex & Gold (XAUUSD) trade signals.
An n8n AI agent publishes validated signals to `data/signals.json`; every push to `main` auto-deploys on your chosen host (Vercel or Cloudflare Pages).

## File structure

```
├── index.html              # Dashboard layout with EN/BN toggle
├── css/
│   └── styles.css          # Responsive styles (breakpoints 768px / 1024px)
├── js/
│   ├── i18n.js             # English/Bengali UI dictionary
│   └── app.js              # Fetches signals.json, renders cards, language toggle
├── data/
│   └── signals.json        # All published signals (agent writes here)
├── workers/
│   └── telegram-bot.js     # Optional Telegram bot Cloudflare Worker
└── vercel.json             # Vercel config (clean URLs, no-cache for signals.json)
```

## signals.json schema

```json
{
  "id": "xauusd-2026-01-15-001",
  "published_at": "2026-01-15T07:00:00Z",
  "pair": "XAUUSD",
  "direction": "BUY",
  "entry": 2401.5,
  "stop_loss": 2386.5,
  "take_profit": 2428.0,
  "max_lot_size": 0.05,
  "volatility_range": "±38 pips (2386-2428)",
  "status": "active",
  "content_en": "...full breakdown in English...",
  "content_bn": "...full breakdown in Bengali..."
}
```

## Deploy steps

You can host the dashboard on **Vercel** (recommended) or **Cloudflare Pages** — pick one, or use both as mirrors.

### Option A — Vercel (recommended)

1. Go to [vercel.com/new](https://vercel.com/new) and **Import Git Repository** → select `Amanat026/smc-lab`.
2. Configure the project:
   - Framework Preset: **Other**
   - Build Command: *(leave empty)* — no build step
   - Output Directory: *(leave empty / root `/`)*
   - Install Command: *(leave empty)*
3. Click **Deploy**. Your site goes live at a URL like `https://smc-lab.vercel.app`.
4. The included `vercel.json` is applied automatically: clean URLs, and `data/signals.json` is served with `no-store` so fresh signals are never cached stale.
5. **Auto-deploy:** every commit to `main` — including the agent's `signals.json` updates — triggers an automatic Vercel production redeploy.
6. **Verify:** open the site — the seed XAUUSD signal card should render. Toggle English ↔ বাংলা with the header button.

### Option B — Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git.
2. Select `Amanat026/smc-lab`.
3. Framework preset: **None**. Build command: *(leave empty)*. Build output directory: **/** (root).
4. Deploy. Your site goes live at `https://smc-lab.pages.dev`.
5. **Auto-deploy:** every commit to `main` triggers a new Pages deploy automatically.
6. **Verify:** open the site — the seed XAUUSD signal card should render. Toggle English ↔ বাংলা with the header button.

### Optional — Telegram bot Worker (Cloudflare)

1. `npm i -g wrangler && wrangler login`
2. `wrangler secret put BOT_TOKEN` (paste your rotated @BotFather token — never commit it)
3. `wrangler deploy workers/telegram-bot.js`
4. Set the webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>`
5. Send `/id` to the bot in your channel/group to get the chat ID for the agent.

## Notes

- No build step, no dependencies — vanilla HTML/CSS/JS.
- Bengali UI uses the Noto Sans Bengali webfont.
- `data/signals.json` must remain a valid JSON array; the agent prepends new signals (newest first).
- On Vercel, `vercel.json` forces `Cache-Control: no-store` on `/data/signals.json` so clients always see the latest signals.
