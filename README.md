# SMC Liquidity Hunting AI Lab — Signal Dashboard

Bilingual (English/বাংলা) static dashboard for institutional SMC Forex & Gold (XAUUSD) trade signals.
An n8n AI agent publishes validated signals to `data/signals.json`; every push to `main` auto-deploys via Cloudflare Pages.

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
└── workers/
    └── telegram-bot.js     # Optional Telegram bot Cloudflare Worker
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

1. **Clone or fork this repo** (already done if you're reading this on GitHub).
2. **Cloudflare Pages:**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git.
   - Select `Amanat026/smc-lab`.
   - Framework preset: **None**. Build command: *(leave empty)*. Build output directory: **/** (root).
   - Deploy. Your site goes live at `https://smc-lab.pages.dev`.
3. **Verify:** open the site — the seed XAUUSD signal card should render. Toggle English ↔ বাংলা with the header button.
4. **Auto-deploy:** every commit to `main` (including agent signal updates to `data/signals.json`) triggers a new Pages deploy automatically.
5. **Optional Telegram Worker:**
   - `npm i -g wrangler && wrangler login`
   - `wrangler secret put BOT_TOKEN` (paste your rotated @BotFather token — never commit it)
   - `wrangler deploy workers/telegram-bot.js`
   - Set the webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>`
   - Send `/id` to the bot in your channel/group to get the chat ID for the agent.

## Notes

- No build step, no dependencies — vanilla HTML/CSS/JS.
- Bengali UI uses the Noto Sans Bengali webfont.
- `data/signals.json` must remain a valid JSON array; the agent prepends new signals (newest first).
