# SMC Liquidity Hunting AI Lab — Signal Dashboard

Bilingual (English/বাংলা) static dashboard for institutional SMC Forex & Gold (XAUUSD) trade signals, with a live TradingView chart and a visual SMC market-structure overlay.
An n8n AI agent publishes validated signals to `data/signals.json`; every push to `main` auto-deploys on your chosen host (Vercel or Cloudflare Pages).

## Features

- **Live TradingView Advanced Real-Time Chart** locked to XAUUSD (OANDA feed) with W1 / D1 / 4H timeframe selector, dark theme.
- **Live ticker tape** for XAUUSD, EURUSD, GBPUSD, USDJPY (real-time, no static/delayed values).
- **Visual SMC overlay map** rendered from each signal's `smc_overlay` data: BSL/SSL sweep zones, bullish/bearish Order Blocks, Fair Value Gaps, and dashed Entry / SL / TP level lines — all price-mapped on a scaled panel below the chart.
- **Dynamic EN/বাংলা toggle** covering every UI string, persisted in localStorage, fully responsive (breakpoints 768px / 1024px).
- **Auto-refresh** of signals every 60s (plus `no-store` caching on Vercel) so new signals appear without a reload.

## File structure

```
├── index.html              # Dashboard layout: TradingView widgets, SMC overlay, EN/BN toggle
├── css/
│   └── styles.css          # Responsive styles, overlay map zones/levels (768px / 1024px)
├── js/
│   ├── i18n.js             # English/Bengali UI dictionary (all strings incl. overlay legend)
│   └── app.js              # TradingView loader, signals.json fetch, cards, overlay renderer
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
  "smc_overlay": {
    "bsl_zone": { "low": 2430.0, "high": 2433.5 },
    "ssl_zone": { "low": 2396.0, "high": 2398.5 },
    "order_blocks": [ { "type": "bullish", "low": 2400.0, "high": 2403.0 } ],
    "fvgs": [ { "low": 2405.0, "high": 2408.0 } ]
  },
  "content_en": "...full breakdown in English...",
  "content_bn": "...full breakdown in Bengali..."
}
```

`smc_overlay` zones drive the visual structure map: zones are drawn as price-positioned bands, and entry/SL/TP as dashed level lines. Zone prices must be numbers with `low < high`.

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
6. **Verify:** open the site — the live XAUUSD chart, ticker tape, seed signal card and SMC overlay map should render. Toggle English ↔ বাংলা with the header button.

### Option B — Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git.
2. Select `Amanat026/smc-lab`.
3. Framework preset: **None**. Build command: *(leave empty)*. Build output directory: **/** (root).
4. Deploy. Your site goes live at `https://smc-lab.pages.dev`.
5. **Auto-deploy:** every commit to `main` triggers a new Pages deploy automatically.
6. **Verify:** open the site — chart, ticker, seed signal card and SMC overlay map should render.

### Optional — Telegram bot Worker (Cloudflare)

1. `npm i -g wrangler && wrangler login`
2. `wrangler secret put BOT_TOKEN` (paste your rotated @BotFather token — never commit it, never paste it in chat)
3. `wrangler deploy workers/telegram-bot.js`
4. Set the webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>`
5. Send `/id` to the bot in your channel/group to get the chat ID for the agent.

## Notes

- No build step, no dependencies — vanilla HTML/CSS/JS plus official TradingView embed widgets.
- Bengali UI uses the Noto Sans Bengali webfont.
- `data/signals.json` must remain a valid JSON array; the agent prepends new signals (newest first). The newest signal's `smc_overlay` drives the visual structure map.
- On Vercel, `vercel.json` forces `Cache-Control: no-store` on `/data/signals.json` so clients always see the latest signals.
