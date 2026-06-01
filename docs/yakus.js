(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */
  let yakus = [];
  let translations = {};
  let lang = localStorage.getItem('lang') || 'en';
  const activeFilters = new Set();

  /* ── Filter definitions ────────────────────────────────────── */
  const FILTERS = [
    { id: 'yakuman',      tkey: 'TKEY_FILTER_YAKUMAN',      test: y => y.yakuman === true },
    { id: 'toitsu_based', tkey: 'TKEY_FILTER_TOITSUBASED',  test: y => y.toitsu_based === true },
    { id: 'jihai_based',  tkey: 'TKEY_FILTER_JIHAIBASED',   test: y => y.jihai_based === true },
    { id: 'rare',         tkey: 'TKEY_FILTER_RARE',         test: y => y.yakuman === true || y.rare === true },
    { id: 'common',       tkey: 'TKEY_FILTER_COMMON',       test: y => y.common === true },
    { id: 'single_suit',  tkey: 'TKEY_FILTER_SINGLESUIT',   test: y => y.single_suit === true },
    { id: 'yaochuu',      tkey: 'TKEY_FILTER_YAOCHUUBASED', test: y => y.yaochuu_based === true },
  ];

  /* ── Translation helpers ───────────────────────────────────── */
  function t(key) {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['en'] || key;
  }

  // Replace every TKEY_... in a string with its translated value.
  const TKEY_RE = /TKEY_[A-Z0-9_]+/g;
  function interp(str) {
    if (!str) return '';
    return str.replace(TKEY_RE, match => t(match));
  }

  /* ── Value formatting ──────────────────────────────────────── */
  function fmtValue(y) {
    if (y.yakuman) {
      const open = y.value_open !== null && y.value_open !== undefined;
      const label = '<span class="v-ym">Yakuman</span>';
      return open ? label : label + '<br><small>closed only</small>';
    }

    const hasOpen   = y.value_open   !== null && y.value_open   !== undefined;
    const hasClosed = y.value_closed !== null && y.value_closed !== undefined;

    if (hasOpen && hasClosed) {
      if (y.value_open === y.value_closed) {
        return '<span class="v-han">' + y.value_closed + '</span> han';
      }
      return (
        'Open: <span class="v-han">' + y.value_open + '</span> han<br>' +
        'Closed: <span class="v-han">' + y.value_closed + '</span> han'
      );
    }
    if (hasClosed) {
      return (
        'Closed only:<br><span class="v-han">' + y.value_closed + '</span> han'
      );
    }
    return '';
  }

  /* ── Card rendering ────────────────────────────────────────── */
  function renderCard(y) {
    const card = document.createElement('div');
    card.className = 'yaku-card' + (y.yakuman ? ' is-yakuman' : '');
    card.setAttribute('role', 'listitem');

    // Tags
    const tags = [];
    if (y.yakuman)             tags.push({ text: t('TKEY_FILTER_YAKUMAN'), cls: 'ym' });
    if (y.common)              tags.push({ text: t('TKEY_FILTER_COMMON'),  cls: 'com' });
    if (y.rare && !y.yakuman)  tags.push({ text: t('TKEY_FILTER_RARE'),   cls: 'rare' });
    if (y.not_yaku)            tags.push({ text: 'Bonus',                  cls: 'bonus' });

    const tagsHtml = tags.length
      ? '<div class="yaku-tags">' +
          tags.map(tg => '<span class="tag ' + tg.cls + '">' + tg.text + '</span>').join('') +
        '</div>'
      : '';

    const notesHtml = y.notes
      ? '<div class="yaku-notes">' + interp(y.notes) + '</div>'
      : '';

    const exampleHtml = y.example
      ? '<div class="yaku-example">' + interp(y.example) + '</div>'
      : '';

    card.innerHTML =
      '<div class="yaku-header">' +
        '<div class="yaku-name">' + interp(y.name) + '</div>' +
        '<div class="yaku-value">' + fmtValue(y) + '</div>' +
      '</div>' +
      '<div class="yaku-desc">' + interp(y.description) + '</div>' +
      notesHtml +
      exampleHtml +
      tagsHtml;

    return card;
  }

  /* ── Grid update ───────────────────────────────────────────── */
  function render() {
    const grid = document.getElementById('yaku-grid');
    grid.innerHTML = '';

    const fns = FILTERS
      .filter(f => activeFilters.has(f.id))
      .map(f => f.test);

    const visible = fns.length
      ? yakus.filter(y => fns.every(fn => fn(y)))
      : yakus;

    if (visible.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'empty-state';
      msg.textContent = 'No yakus match the selected filters.';
      grid.appendChild(msg);
      return;
    }

    const frag = document.createDocumentFragment();
    visible.forEach(y => frag.appendChild(renderCard(y)));
    grid.appendChild(frag);
  }

  /* ── Filter dropdown ───────────────────────────────────────── */
  function buildFilterMenu() {
    const menu = document.getElementById('filter-menu');
    menu.innerHTML = '';
    FILTERS.forEach(f => {
      const label = document.createElement('label');
      label.className = 'filter-opt';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = activeFilters.has(f.id);
      cb.addEventListener('change', () => {
        if (cb.checked) activeFilters.add(f.id);
        else activeFilters.delete(f.id);
        syncFilterBtn();
        render();
      });

      label.appendChild(cb);
      label.appendChild(document.createTextNode('\u00A0' + t(f.tkey)));
      menu.appendChild(label);
    });
  }

  function syncFilterBtn() {
    const btn = document.getElementById('filter-btn');
    const n = activeFilters.size;
    btn.textContent = n ? 'Filter (' + n + ') \u25BE' : 'Filter \u25BE';
    btn.classList.toggle('filter-active', n > 0);
  }

  function initDropdown() {
    const btn  = document.getElementById('filter-btn');
    const menu = document.getElementById('filter-menu');

    btn.addEventListener('click', e => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', () => menu.classList.remove('open'));
    menu.addEventListener('click', e => e.stopPropagation());
  }

  /* ── Language selector ─────────────────────────────────────── */
  function initLang() {
    const sel = document.getElementById('lang-select');
    sel.value = lang;
    sel.addEventListener('change', () => {
      lang = sel.value;
      localStorage.setItem('lang', lang);
      buildFilterMenu();
      render();
    });
  }

  /* ── Theme toggle ──────────────────────────────────────────── */
  function initTheme() {
    const btn = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;

    function apply(isDark) {
      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        btn.textContent = 'Light';
      } else {
        document.documentElement.removeAttribute('data-theme');
        btn.textContent = 'Dark';
      }
    }

    apply(dark);

    btn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      apply(!isDark);
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
    });
  }

  /* ── Bootstrap ─────────────────────────────────────────────── */
  async function init() {
    initTheme();

    try {
      const [yr, tr] = await Promise.all([
        fetch('resources/yakus.json'),
        fetch('resources/translations.json'),
      ]);
      if (!yr.ok || !tr.ok) throw new Error('fetch failed');
      yakus        = await yr.json();
      translations = await tr.json();
    } catch (err) {
      document.getElementById('yaku-grid').innerHTML =
        '<div class="empty-state">Failed to load data. Please refresh the page.</div>';
      console.error(err);
      return;
    }

    initLang();
    initDropdown();
    buildFilterMenu();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
}());
