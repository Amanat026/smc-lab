# SMC Liquidity Hunting AI Lab — Signal Dashboard

Bilingual (English/বাংলা) static dashboard for institutional SMC Forex & Gold (XAUUSD) trade signals, with a live TradingView chart and a visual SMC market-structure overlay.
An n8n AI agent publishes validated signals to `data/signals.json`; every push to `main` auto-deploys on your chosen host (Vercel or Cloudflare Pages).

## Features

- **Live TradingView Advanced Real-Time Chart** locked to XAUUSD (OANDA feed) with W1 / D1 / 4H timeframe selector, dark theme.
- **Live ticker tape** for XAUUSD, EURUSD, GBPUSD, USDJPY (real-time, no static/delayed values).
- **Custom SMC candlestick chart** (lightweight-charts) rendering each signal's `candles` with the `smc_overlay` drawn on top: BSL/SSL zones, bullish/bearish Order Blocks, Fair Value Gaps, and labeled Entry / SL / TP level lines.
- **Dynamic money management module**: editable account balance + risk % selector computing max lot size from SL distance, plus explicit Risk:Reward display.
- **Dynamic EN/বাংলা toggle** covering every UI string, persisted in localStorage, fully responsive (breakpoints 768px / 1024px).
- **Auto-refresh** of signals every 60s (plus `no-store` caching on Vercel) with a "last sync" clock so new signals appear without a reload.
- **Social sharing**: Open Graph + Twitter Card meta tags with branded banner (`assets/og-banner.svg`).

## File structure

```
├── index.html              # Dashboard layout: OG meta, TradingView widgets, charts, EN/BN toggle
├── css/
│   └── styles.css          # Institutional terminal theme (768px / 1024px breakpoints)
├── js/
│   ├── i18n.js             # English/Bengali UI dictionary (all strings)
│   └── app.js              # TradingView loader, SMC candlestick chart, money management, cards
├── data/
│   └── signals.json        # All published signals (agent writes here)
├── assets/
│   └── og-banner.svg       # Branded 1200×630 social preview banner
└── vercel.json             # Vercel config (clean URLs, no-cache for signals.json)
```

## signals.json schema

```json
{
  "id": "xauusd-2026-09-28-001",
  "published_at": "2026-09-28T10:30:00Z",
  "pair": "XAUUSD",
  "direction": "BUY",
  "entry": 4138.5,
  "stop_loss": 4120.5,
  "take_profit": 4172.0,
  "max_lot_size": 0.04,
  "volatility_range": "±52 pips (4094-4198)",
  "status": "active",
  "reference_price": 4146.3,
  "sl_pips": 180,
  "rr": 1.9,
  "smc_overlay": {
    "bsl_zone": { "low": 4168.0, "high": 4171.5 },
    "ssl_zone": { "low": 4126.0, "high": 4129.5 },
    "order_blocks": [ { "type": "bullish", "low": 4131.0, "high": 4136.0 } ],
    "fvgs": [ { "low": 4142.0, "high": 4146.0 } ]
  },
  "candles": [
    { "time": 1759276800, "open": 4148.0, "high": 4158.0, "low": 4136.0, "close": 4146.3 }
  ],
  "content_en": "...full breakdown in English...",
  "content_bn": "...full breakdown in Bengali..."
}
```

- `smc_overlay` zones drive the chart's shaded bands (numbers, `low < high`).
- `candles` are ascending unix-second OHLC bars rendered by the SMC candlestick chart.
- `sl_pips` / `rr` feed the money-management module; `reference_price` is shown as the live anchor.

## Deploy steps

You can host the dashboard on **Vercel** (recommended) or **Cloudflare Pages** — pick one, or use both as mirrors.

### Option A — Vercel (recommended)

1. Go to [vercel.com/new](https://vercel.com/new) and **Import Git Repository** → select `Amanat026/smc-lab`.
2. Configure the project:
   - Framework Preset: **Other**
   - Build Command: *(leave empty)* — no build step
   - Output Directory: *(leave empty / root `/`)*
   - Install Command: *(leave empty)*
3. Click **Deploy**. Your site goes live at a URL like `https://smc-lab-eight.vercel.app`.
4. The included `vercel.json` is applied automatically: clean URLs, and `data/signals.json` is served with `no-store` so fresh signals are never cached stale.
5. **Auto-deploy:** every commit to `main` — including the agent's `signals.json` updates — triggers an automatic Vercel production redeploy.
6. **Verify:** open the site — the live XAUUSD chart, ticker tape, SMC candlestick map, money-management panel and signal cards should render. Toggle English ↔ বাংলা with the header button.

### Option B — Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git.
2. Select `Amanat026/smc-lab`.
3. Framework preset: **None**. Build command: *(leave empty)*. Build output directory: **/** (root).
4. Deploy. Your site goes live at `https://smc-lab.pages.dev`.
5. **Auto-deploy:** every commit to `main` triggers a new Pages deploy automatically.

## Notes

- No build step, no dependencies — vanilla HTML/CSS/JS plus official TradingView embed widgets and the lightweight-charts CDN.
- Bengali UI uses the Noto Sans Bengali webfont.
- `data/signals.json` must remain a valid JSON array; the agent prepends new signals (newest first). The newest signal's `candles` + `smc_overlay` drive the SMC chart and money-management calculations.
- On Vercel, `vercel.json` forces `Cache-Control: no-store` on `/data/signals.json` so clients always see the latest signals.
- Distribution is this dashboard only — no messenger integrations.
- The OG banner is SVG (works on most crawlers); if a platform requires PNG/JPG, convert `assets/og-banner.svg` to `og-banner.png` (1200×630) and update the `og:image`/`twitter:image` URLs.
