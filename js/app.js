// SMC Liquidity Hunting AI Lab dashboard — TradingView live chart + bilingual signal cards + visual SMC overlay.
(function () {
  var STORAGE_KEY = 'smc-lang';
  var lang = localStorage.getItem(STORAGE_KEY) || 'en';
  var signals = [];
  var currentTf = 'D';

  var grid = document.getElementById('signals');
  var emptyState = document.getElementById('empty-state');
  var toggleBtn = document.getElementById('lang-toggle');
  var overlay = document.getElementById('smc-overlay');
  var smcMap = document.getElementById('smc-map');

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }

  function applyStaticStrings() {
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    toggleBtn.textContent = t('lang_button');
  }

  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (e) {
      return iso;
    }
  }

  /* ---------- TradingView Advanced Real-Time Chart (live XAUUSD feed) ---------- */
  function loadChart(interval) {
    var container = document.getElementById('tv-chart');
    container.innerHTML = '';
    var widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    var widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetContainer.appendChild(widgetDiv);
    container.appendChild(widgetContainer);

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: 'OANDA:XAUUSD',
      interval: interval,
      timezone: 'Asia/Dubai',
      theme: 'dark',
      style: '1',
      locale: 'en',
      hide_side_toolbar: false,
      allow_symbol_change: false,
      withdateranges: true,
      studies: ['Volume@tv-basicstudies'],
      support_host: 'https://www.tradingview.com'
    });
    widgetContainer.appendChild(script);
  }

  document.querySelectorAll('.tf-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tf-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentTf = btn.getAttribute('data-tf');
      loadChart(currentTf);
    });
  });

  /* ---------- Visual SMC overlay (price-mapped zones & levels) ---------- */
  function renderOverlay(signal) {
    var o = signal && signal.smc_overlay;
    if (!o) { overlay.hidden = true; return; }

    // Collect all price points to compute the mapped range.
    var prices = [signal.entry, signal.stop_loss, signal.take_profit];
    function zonePrices(z) { if (z && typeof z.low === 'number' && typeof z.high === 'number') { prices.push(z.low, z.high); } }
    zonePrices(o.bsl_zone); zonePrices(o.ssl_zone);
    (o.order_blocks || []).forEach(zonePrices);
    (o.fvgs || []).forEach(zonePrices);
    prices = prices.filter(function (p) { return typeof p === 'number' && isFinite(p); });
    if (prices.length < 2) { overlay.hidden = true; return; }

    var min = Math.min.apply(null, prices);
    var max = Math.max.apply(null, prices);
    var pad = (max - min) * 0.08 || 1;
    min -= pad; max += pad;

    function pct(price) { return ((max - price) / (max - min)) * 100; } // top% position

    var html = '<div class="smc-price-axis">';
    for (var i = 0; i <= 4; i++) {
      var p = max - ((max - min) * i / 4);
      html += '<span style="top:' + (i * 25) + '%">' + p.toFixed(1) + '</span>';
    }
    html += '</div>';

    function zoneHtml(z, cls, label) {
      var top = pct(z.high), height = Math.max(pct(z.low) - top, 1.2);
      return '<div class="zone ' + cls + '" style="top:' + top + '%;height:' + height + '%"></div>' +
             '<span class="zone-label" style="top:' + (top + height / 2) + '%">' + esc(label) + ' ' + esc(z.low) + '–' + esc(z.high) + '</span>';
    }

    if (o.bsl_zone) html += zoneHtml(o.bsl_zone, 'bsl', 'BSL');
    if (o.ssl_zone) html += zoneHtml(o.ssl_zone, 'ssl', 'SSL');
    (o.order_blocks || []).forEach(function (ob) {
      html += zoneHtml(ob, ob.type === 'bearish' ? 'ob-bear' : 'ob-bull', ob.type === 'bearish' ? 'Bearish OB' : 'Bullish OB');
    });
    (o.fvgs || []).forEach(function (f) { html += zoneHtml(f, 'fvg', 'FVG'); });

    function levelHtml(price, cls, label) {
      return '<div class="level-line ' + cls + '" style="top:' + pct(price) + '%"></div>' +
             '<span class="zone-label" style="top:' + pct(price) + '%;right:70px;left:auto">' + esc(label) + ' ' + esc(price) + '</span>';
    }
    html += levelHtml(signal.entry, 'entry', t('entry'));
    html += levelHtml(signal.stop_loss, 'sl', t('stop_loss'));
    html += levelHtml(signal.take_profit, 'tp', t('take_profit'));

    smcMap.innerHTML = html;
    overlay.hidden = false;
  }

  /* ---------- Signal cards ---------- */
  function render() {
    applyStaticStrings();
    grid.innerHTML = '';

    if (!signals.length) {
      emptyState.hidden = false;
      overlay.hidden = true;
      return;
    }
    emptyState.hidden = true;

    var sorted = signals.slice().sort(function (a, b) {
      return new Date(b.published_at) - new Date(a.published_at);
    });

    // Map the newest signal's overlay below the live chart.
    renderOverlay(sorted[0]);

    sorted.forEach(function (s) {
      var isBuy = String(s.direction).toUpperCase() === 'BUY';
      var content = lang === 'bn' ? s.content_bn : s.content_en;
      var card = document.createElement('article');
      card.className = 'signal-card';
      card.innerHTML =
        '<div class="signal-top">' +
          '<span class="pair">' + esc(s.pair) + '</span>' +
          '<span class="badge ' + (isBuy ? 'buy' : 'sell') + '">' + esc(s.direction) + '</span>' +
        '</div>' +
        '<div class="levels">' +
          '<div class="level"><div class="label">' + esc(t('entry')) + '</div><div class="value">' + esc(s.entry) + '</div></div>' +
          '<div class="level"><div class="label">' + esc(t('stop_loss')) + '</div><div class="value">' + esc(s.stop_loss) + '</div></div>' +
          '<div class="level"><div class="label">' + esc(t('take_profit')) + '</div><div class="value">' + esc(s.take_profit) + '</div></div>' +
        '</div>' +
        '<div class="meta">' +
          '<span>' + esc(t('max_lot')) + ': <strong>' + esc(s.max_lot_size) + '</strong></span>' +
          '<span>' + esc(t('volatility')) + ': <strong>' + esc(s.volatility_range) + '</strong></span>' +
          '<span class="status ' + esc(s.status || '') + '">' + esc(s.status) + '</span>' +
        '</div>' +
        '<div class="content">' + esc(content) + '</div>' +
        '<div class="published">' + esc(formatDate(s.published_at)) + '</div>';
      grid.appendChild(card);
    });
  }

  function loadSignals() {
    fetch('data/signals.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('signals.json not found');
        return res.json();
      })
      .then(function (data) {
        signals = Array.isArray(data) ? data : [];
        render();
      })
      .catch(function () {
        signals = [];
        render();
      });
  }

  toggleBtn.addEventListener('click', function () {
    lang = lang === 'en' ? 'bn' : 'en';
    localStorage.setItem(STORAGE_KEY, lang);
    render();
  });

  loadChart(currentTf);
  loadSignals();
  // Refresh signals every 60s so newly published signals appear without a reload.
  setInterval(loadSignals, 60000);
})();
