// SMC Liquidity Hunting AI Lab dashboard — fetches data/signals.json and renders bilingual signal cards.
(function () {
  const STORAGE_KEY = 'smc-lang';
  let lang = localStorage.getItem(STORAGE_KEY) || 'en';
  let signals = [];

  const grid = document.getElementById('signals');
  const emptyState = document.getElementById('empty-state');
  const toggleBtn = document.getElementById('lang-toggle');

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
    const div = document.createElement('div');
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

  function render() {
    applyStaticStrings();
    grid.innerHTML = '';

    if (!signals.length) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const sorted = signals.slice().sort(function (a, b) {
      return new Date(b.published_at) - new Date(a.published_at);
    });

    sorted.forEach(function (s) {
      const isBuy = String(s.direction).toUpperCase() === 'BUY';
      const content = lang === 'bn' ? s.content_bn : s.content_en;
      const card = document.createElement('article');
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

  loadSignals();
})();
