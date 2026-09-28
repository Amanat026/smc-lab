# Amanat's Gold Signal — SMC Liquidity Hunting AI Lab

Bilingual (English/বাংলা) static dashboard for institutional SMC Gold (XAUUSD) trade signals, hosted on **Vercel**.
An n8n AI agent publishes validated signals to `data/signals.json`; every push to `main` triggers an automatic Vercel production deploy.

**Live site:** https://smc-lab-eight.vercel.app

## Features

- **Live TradingView chart** locked to XAUUSD (OANDA feed) with W1 / D1 / 4H timeframe selector, dark theme.
- **Live ticker tape** for XAUUSD, EURUSD, GBPUSD, USDJPY.
- **SMC candlestick map** (lightweight-charts) drawing each signal's `candles` with the `smc_overlay`: BSL/SSL zones, bullish/bearish Order Blocks, Fair Value Gaps, and Entry / SL / TP lines.
- **Underlying Stream panel**: higher-timeframe institutional flow direction, confidence and evidence.
- **4-session architecture**: 24h cycle bar and session cards with live per-second countdowns (Dubai time).
- **Signal lifecycle**: active vs closed signals, status chips, TP/SL card states and a *Today's Results* section with pip totals.
- **Money management**: editable balance + risk % selector computing max lot size from SL distance, plus Risk:Reward.
- **EN/বাংলা toggle** covering every UI string, persisted in localStorage; responsive (768px / 1024px breakpoints).
- **Auto-refresh** every 60s with a "last sync" clock and a live Dubai header clock.
- **Social sharing**: Open Graph + Twitter Card meta tags with branded banner (`assets/og-banner.svg`).

## File structure

```
├── index.html              # Layout: OG meta, TradingView widgets, stream/session/chart/MM/signal/results sections
├── css/
│   ├── styles.css          # Institutional terminal theme (768px / 1024px breakpoints)
│   ├── stream.css          # Underlying Stream panel
│   ├── sessions.css        # Session cards + 24h cycle bar
│   └── lifecycle.css       # Status chips, TP/SL states, Today's Results
├── js/
│   ├── i18n.js             # English/Bengali UI dictionary
│   └── app.js              # Charts, sessions, stream, lifecycle, money management, cards
├── data/
│   └── signals.json        # All published signals (n8n agent writes here)
├── assets/
│   └── og-banner.svg       # 1200×630 social preview banner
└── vercel.json             # Clean URLs, security headers, no-store for signals.json
```

## signals.json schema

`data/signals.json` is a JSON **array**, newest signal first.

```json
{
  "id": "xauusd-pre_london-2026-09-28",
  "published_at": "2026-09-28T05:30:00Z",
  "session": "pre_london",
  "session_label_en": "Pre-London",
  "session_label_bn": "প্রি-লন্ডন",
  "session_time_dubai": "10:00",
  "pair": "XAUUSD",
  "direction": "BUY",
  "entry": 4141.0,
  "stop_loss": 4127.5,
  "take_profit": 4168.0,
  "max_lot_size": 0.05,
  "volatility_range": "±52 pips (4094-4198)",
  "status": "active",
  "reference_price": 4146.3,
  "sl_pips": 135,
  "rr": 2.0,
  "entry_valid_until": "2026-09-28T06:30:00Z",
  "closed_at": null,
  "result_pips": null,
  "stream": {
    "direction": "bullish",
    "confidence": "high",
    "summary_en": "...",
    "summary_bn": "...",
    "htf_evidence": ["D1 accumulation at 4050-4080 demand zone"]
  },
  "smc_overlay": {
    "bsl_zone": { "low": 4168.0, "high": 4171.5 },
    "ssl_zone": { "low": 4126.0, "high": 4129.5 },
    "order_blocks": [ { "type": "bullish", "low": 4138.0, "high": 4141.0 } ],
    "fvgs": [ { "low": 4142.0, "high": 4146.0 } ]
  },
  "candles": [
    { "time": 1759068000, "open": 4152.0, "high": 4156.5, "low": 4148.0, "close": 4150.5 }
  ],
  "content_en": "...full breakdown in English...",
  "content_bn": "...full breakdown in Bengali..."
}
```

- `session`: one of the 4 daily session keys; labels and Dubai time are shown on the card.
- `status` / `closed_at` / `result_pips`: lifecycle fields — the agent updates them when TP or SL is hit so the signal moves to *Today's Results*.
- `entry_valid_until`: after this time an unfilled signal should no longer be treated as active.
- `smc_overlay` zones are numbers with `low < high`; `candles` are ascending unix-second OHLC bars (15m).
- `sl_pips` / `rr` feed the money-management module; `reference_price` is the live anchor price.

## Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → select `Amanat026/smc-lab`.
2. Project settings:
   - Framework Preset: **Other**
   - Build Command: *(leave empty)*
   - Output Directory: *(leave empty — repo root)*
   - Install Command: *(leave empty)*
3. Click **Deploy**. The site goes live at `https://smc-lab-eight.vercel.app` (or your assigned URL).
4. `vercel.json` is applied automatically:
   - clean URLs (no `.html` in paths),
   - `data/signals.json` served as JSON with `no-store` at browser and CDN level, so new signals appear immediately,
   - basic security headers on every response.
5. **Auto-deploy:** every commit to `main` — including the n8n agent's `signals.json` updates — creates a new production deployment. Other branches get preview URLs.
6. **Custom domain (optional):** Project → Settings → Domains → add your domain, then update the `og:url` / `og:image` / `twitter:image` URLs in `index.html`.

### Verify after deploy

- Open the site: live XAUUSD chart, ticker tape, stream panel, session cycle bar, SMC map, money-management panel and signal cards should render.
- Open `/data/signals.json` and check the response headers include `Cache-Control: no-store`.
- Toggle English ↔ বাংলা with the header button.

## Notes

- No build step, no dependencies — vanilla HTML/CSS/JS plus TradingView embed widgets and the lightweight-charts CDN.
- Bengali UI uses the Noto Sans Bengali webfont.
- Keep `data/signals.json` a valid JSON array; an invalid file breaks the signal cards until the next valid commit.
- The OG banner is SVG; if a platform requires PNG/JPG, convert `assets/og-banner.svg` to `og-banner.png` (1200×630) and update the `og:image` / `twitter:image` URLs.
- Distribution is this dashboard only — no messenger integrations.
