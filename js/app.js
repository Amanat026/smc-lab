// SMC Liquidity Hunting AI Lab dashboard.
// TradingView live feed + custom 15m candlestick chart with SMC markings
// + Underlying Stream panel + 4-session timeline + money management + auto-refresh.
(function () {
  var STORAGE_LANG = 'smc-lang';
  var STORAGE_BALANCE = 'smc-balance';
  var STORAGE_RISK = 'smc-risk';

  var SESSIONS = ['pre_london', 'post_london', 'pre_ny', 'post_ny'];
  var SESSION_TIMES = { pre_london: '09:30', post_london: '12:30', pre_ny: '16:00', post_ny: '19:30' };

  var lang = localStorage.getItem(STORAGE_LANG) || 'en';
  var signals = [];
  var currentTf = 'D';
  var smcChart = null;
  var smcCandleSeries = null;
  var lastSyncAt = null;

  var balance = parseFloat(localStorage.getItem(STORAGE_BALANCE)) || 500;
  var riskPct = parseFloat(localStorage.getItem(STORAGE_RISK)) || 1;

  var grid = document.getElementById('signals');
  var emptyState = document.getElementById('empty-state');
  var toggleBtn = document.getElementById('lang-toggle');
  var lastSyncEl = document.getElementById('last-sync-time');
  var stripEl = document.getElementById('session-strip');
  var streamPanel = document.getElementById('stream-panel');
  var streamConfidence = document.getElementById('stream-confidence');
  var streamIndicator = document.getElementById('stream-indicator');
  var streamArrow = document.getElementById('stream-arrow');
  var streamDirection = document.getElementById('stream-direction');
  var streamSummary = document.getElementById('stream-summary');
  var streamEvidence = document.getElementById('stream-evidence');
  var mmBalance = document.getElementById('mm-balance');
  var mmLot = document.getElementById('mm-lot');
  var mmRr = document.getElementById('mm-rr');
  var mmRestriction = document.getElementById('mm-restriction');

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }

  function sessionLabel(s) {
    var key = 'session_' + (s.session || 'manual');
    return (s.session_label_en && lang === 'en') ? s.session_label_en
         : (s.session_label_bn && lang === 'bn') ? s.session_label_bn
         : t(key);
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

  function renderLastSync() {
    if (lastSyncAt) lastSyncEl.textContent = formatDate(lastSyncAt);
  }

  /* ================= Underlying Stream panel ================= */
  function renderStreamPanel() {
    var s = newestSignal();
    var stream = s && s.stream;
    if (!stream || !stream.direction) {
      streamPanel.hidden = true;
      return;
    }
    var dir = String(stream.direction).toLowerCase();
    var conf = String(stream.confidence || 'medium').toLowerCase();

    streamPanel.hidden = false;
    streamIndicator.className = 'stream-indicator dir-' + (dir === 'bullish' ? 'bullish' : dir === 'bearish' ? 'bearish' : 'neutral');
    streamArrow.textContent = dir === 'bullish' ? '▲' : dir === 'bearish' ? '▼' : '◆';
    streamDirection.textContent = dir === 'bullish' ? t('stream_bullish') : dir === 'bearish' ? t('stream_bearish') : t('stream_neutral');
    streamConfidence.textContent = t('stream_confidence') + ': ' + conf.toUpperCase();
    streamConfidence.className = 'stream-confidence conf-' + conf;
    streamSummary.textContent = lang === 'bn' ? (stream.summary_bn || stream.summary_en || '') : (stream.summary_en || '');

    streamEvidence.innerHTML = '';
    (stream.htf_evidence || []).forEach(function (ev) {
      var li = document.createElement('li');
      li.textContent = ev;
      streamEvidence.appendChild(li);
    });
  }

  /* ================= Session timeline strip ================= */
  function renderSessionStrip() {
    var today = new Date().toISOString().slice(0, 10);
    var nowUtcMinutes = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
    var nowDubaiMinutes = (nowUtcMinutes + 240) % 1440;

    stripEl.innerHTML = '';
    SESSIONS.forEach(function (sess) {
      var parts = SESSION_TIMES[sess].split(':');
      var fireMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      var fired = signals.some(function (s) {
        return s.session === sess && String(s.published_at || '').slice(0, 10) === today;
      });
      var due = nowDubaiMinutes >= fireMinutes;
      var statusKey = fired ? 'status_live' : (due ? 'status_none' : 'status_pending');
      var chip = document.createElement('div');
      chip.className = 'session-chip s-' + sess.replace('_', '-') + (fired ? '' : ' pending');
      chip.innerHTML =
        '<span class="sess-name">' + esc(t('session_' + sess)) + '</span>' +
        '<span class="sess-time">' + esc(SESSION_TIMES[sess]) + ' ' + esc(t('dubai_time')) + '</span>' +
        '<span class="sess-status">' + esc(t(statusKey)) + '</span>';
      stripEl.appendChild(chip);
    });
  }

  /* ================= TradingView live feed ================= */
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

  /* ================= View tabs ================= */
  document.querySelectorAll('.view-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.view-tab').forEach(function (x) { x.classList.remove('active'); });
      tab.classList.add('active');
      var view = tab.getAttribute('data-view');
      document.getElementById('view-live').hidden = view !== 'live';
      document.getElementById('view-smc').hidden = view !== 'smc';
      document.getElementById('tf-selector').style.visibility = view === 'live' ? 'visible' : 'hidden';
      if (view === 'smc') renderSmcChart();
    });
  });

  /* ================= Custom candlestick chart with SMC markings (15m execution) ================= */
  function zoneColor(cls) {
    return {
      bsl: 'rgba(255, 176, 32, 0.30)',
      ssl: 'rgba(168, 85, 247, 0.28)',
      'ob-bull': 'rgba(16, 185, 129, 0.40)',
      'ob-bear': 'rgba(244, 63, 94, 0.40)',
      fvg: 'rgba(56, 189, 248, 0.28)'
    }[cls];
  }

  function addZone(chart, candles, zone, cls) {
    var first = candles[0].time;
    var last = candles[candles.length - 1].time;
    var span = last > first ? last - first : 3600;
    var end = last + Math.floor(span * 0.25);

    var hist = chart.addHistogramSeries({
      color: zoneColor(cls),
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      priceLineVisible: false,
      lastValueVisible: false,
      base: zone.low
    });
    var data = candles.map(function (c) { return { time: c.time, value: zone.high }; });
    data.push({ time: end, value: zone.high });
    hist.setData(data);
  }

  function addLevelLine(series, price, color, title) {
    series.createPriceLine({
      price: price,
      color: color,
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title: title
    });
  }

  function renderSmcChart() {
    var emptyMsg = document.getElementById('smc-chart-empty');
    var el = document.getElementById('smc-chart');
    if (typeof LightweightCharts === 'undefined') return;

    var signal = newestSignal();
    var candles = signal && Array.isArray(signal.candles) ? signal.candles : [];
    if (!signal || !candles.length) {
      el.innerHTML = '';
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;

    if (smcChart) { smcChart.remove(); smcChart = null; }
    el.innerHTML = '';

    smcChart = LightweightCharts.createChart(el, {
      autoSize: true,
      layout: {
        background: { color: '#10161f' },
        textColor: '#8b98a9',
        fontFamily: "'Inter', 'Noto Sans Bengali', sans-serif"
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' }
      },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' }
    });

    smcCandleSeries = smcChart.addCandlestickSeries({
      upColor: '#00e5a0',
      downColor: '#ff3d71',
      borderUpColor: '#00e5a0',
      borderDownColor: '#ff3d71',
      wickUpColor: '#00e5a0',
      wickDownColor: '#ff3d71'
    });
    smcCandleSeries.setData(candles);

    var o = signal.smc_overlay || {};
    if (o.bsl_zone) addZone(smcChart, candles, o.bsl_zone, 'bsl');
    if (o.ssl_zone) addZone(smcChart, candles, o.ssl_zone, 'ssl');
    (o.order_blocks || []).forEach(function (ob) {
      addZone(smcChart, candles, ob, ob.type === 'bearish' ? 'ob-bear' : 'ob-bull');
    });
    (o.fvgs || []).forEach(function (f) { addZone(smcChart, candles, f, 'fvg'); });

    addLevelLine(smcCandleSeries, signal.entry, '#00e5ff', t('entry'));
    addLevelLine(smcCandleSeries, signal.stop_loss, '#ff3d71', t('stop_loss'));
    addLevelLine(smcCandleSeries, signal.take_profit, '#00e5a0', t('take_profit'));

    smcChart.timeScale().fitContent();
  }

  /* ================= Money management ================= */
  var PIP_VALUE_PER_LOT = 10; // XAUUSD: $10 per pip per standard lot (100 oz)

  function slDistancePips(s) {
    if (typeof s.sl_pips === 'number' && s.sl_pips > 0) return s.sl_pips;
    return Math.abs(s.entry - s.stop_loss) * 10;
  }

  function rrRatio(s) {
    if (typeof s.rr === 'number' && s.rr > 0) return s.rr;
    var risk = Math.abs(s.entry - s.stop_loss);
    var reward = Math.abs(s.take_profit - s.entry);
    return risk > 0 ? reward / risk : 0;
  }

  function newestSignal() {
    if (!signals.length) return null;
    return signals.slice().sort(function (a, b) {
      return new Date(b.published_at) - new Date(a.published_at);
    })[0];
  }

  function renderMoneyManagement() {
    var s = newestSignal();
    if (!s) {
      mmLot.textContent = '—';
      mmRr.textContent = '—';
      mmRestriction.textContent = '';
      return;
    }
    var pips = slDistancePips(s);
    var riskAmount = balance * (riskPct / 100);
    var lot = pips > 0 ? riskAmount / (pips * PIP_VALUE_PER_LOT) : 0;
    lot = Math.max(0.01, Math.floor(lot * 100) / 100);
    var rr = rrRatio(s);

    mmLot.textContent = lot.toFixed(2) + ' Lot';
    mmRr.textContent = '1 : ' + rr.toFixed(1);
    mmRestriction.textContent = t('restriction').replace('{lot}', lot.toFixed(2));
  }

  mmBalance.value = String(balance);
  mmBalance.addEventListener('input', function () {
    balance = parseFloat(mmBalance.value) || 0;
    localStorage.setItem(STORAGE_BALANCE, String(balance));
    renderMoneyManagement();
  });

  document.querySelectorAll('.risk-btn').forEach(function (btn) {
    var val = parseFloat(btn.getAttribute('data-risk'));
    if (val === riskPct) {
      document.querySelectorAll('.risk-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    }
    btn.addEventListener('click', function () {
      riskPct = val;
      localStorage.setItem(STORAGE_RISK, String(riskPct));
      document.querySelectorAll('.risk-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderMoneyManagement();
    });
  });

  /* ================= Signal cards ================= */
  function render() {
    applyStaticStrings();
    renderLastSync();
    renderSessionStrip();
    renderStreamPanel();
    grid.innerHTML = '';

    if (!signals.length) {
      emptyState.hidden = false;
      renderMoneyManagement();
      return;
    }
    emptyState.hidden = true;

    var sorted = signals.slice().sort(function (a, b) {
      return new Date(b.published_at) - new Date(a.published_at);
    });

    sorted.forEach(function (s) {
      var isBuy = String(s.direction).toUpperCase() === 'BUY';
      var content = lang === 'bn' ? s.content_bn : s.content_en;
      var refLine = (typeof s.reference_price === 'number')
        ? '<span>' + esc(t('ref_price')) + ': <strong>' + esc(s.reference_price) + '</strong></span>'
        : '';
      var slPipsLine = '<span>' + esc(t('sl_pips')) + ': <strong>' + esc(slDistancePips(s).toFixed(0)) + ' ' + esc(t('pips')) + '</strong></span>';
      var rrLine = '<span>' + esc(t('rr_label')) + ': <strong>1 : ' + esc(rrRatio(s).toFixed(1)) + '</strong></span>';
      var sessKey = s.session || 'manual';
      var sessBadge = '<span class="session-badge sb-' + esc(sessKey) + '">' + esc(sessionLabel(s)) +
        (s.session_time_dubai ? ' · ' + esc(s.session_time_dubai) : '') + '</span>';
      var streamBadge = (s.stream && s.stream.direction)
        ? '<span class="stream-align-badge' + (String(s.stream.direction).toLowerCase() === 'bearish' ? ' sab-bearish' : '') + '">' +
          (String(s.stream.direction).toLowerCase() === 'bearish' ? '▼ ' : '▲ ') + esc(t('stream_aligned')) + '</span>'
        : '';
      var card = document.createElement('article');
      card.className = 'signal-card ' + (isBuy ? 'card-buy' : 'card-sell');
      card.innerHTML =
        '<div class="signal-top">' +
          '<span class="pair">' + esc(s.pair) + '</span>' +
          sessBadge + streamBadge +
          '<span class="badge ' + (isBuy ? 'buy' : 'sell') + '">' + esc(s.direction) + '</span>' +
        '</div>' +
        '<div class="levels">' +
          '<div class="level lv-entry"><div class="label">' + esc(t('entry')) + '</div><div class="value">' + esc(s.entry) + '</div></div>' +
          '<div class="level lv-sl"><div class="label">' + esc(t('stop_loss')) + '</div><div class="value">' + esc(s.stop_loss) + '</div></div>' +
          '<div class="level lv-tp"><div class="label">' + esc(t('take_profit')) + '</div><div class="value">' + esc(s.take_profit) + '</div></div>' +
        '</div>' +
        '<div class="meta">' +
          refLine + slPipsLine + rrLine +
          '<span>' + esc(t('max_lot')) + ': <strong>' + esc(s.max_lot_size) + '</strong></span>' +
          '<span>' + esc(t('volatility')) + ': <strong>' + esc(s.volatility_range) + '</strong></span>' +
          '<span class="status ' + esc(s.status || '') + '">' + esc(s.status) + '</span>' +
        '</div>' +
        '<div class="content">' + esc(content) + '</div>' +
        '<div class="published">' + esc(t('updated')) + ': ' + esc(formatDate(s.published_at)) + '</div>';
      grid.appendChild(card);
    });

    renderMoneyManagement();
    if (!document.getElementById('view-smc').hidden) renderSmcChart();
  }

  function loadSignals() {
    fetch('data/signals.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('signals.json not found');
        return res.json();
      })
      .then(function (data) {
        signals = Array.isArray(data) ? data : [];
        lastSyncAt = new Date().toISOString();
        render();
      })
      .catch(function () {
        signals = [];
        render();
      });
  }

  toggleBtn.addEventListener('click', function () {
    lang = lang === 'en' ? 'bn' : 'en';
    localStorage.setItem(STORAGE_LANG, lang);
    render();
  });

  loadChart(currentTf);
  loadSignals();
  setInterval(loadSignals, 60000);
})();
