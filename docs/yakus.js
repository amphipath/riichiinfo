(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */
  let yakus = [];
  let translations = {};
  let lang = localStorage.getItem('lang') || 'en';
  const activeFilters = new Set();

  /* ── Filter definitions ────────────────────────────────────── */
  const FILTERS = [
    { id: 'common',       tkey: 'TKEY_FILTER_COMMON',       test: y => y.common === true },
    { id: 'toitsu_based', tkey: 'TKEY_FILTER_TOITSUBASED',  test: y => y.toitsu_based === true },
    { id: 'shuntsu_based', tkey: 'TKEY_FILTER_SHUNTSUBASED',  test: y => y.shuntsu_based === true },
    { id: 'jihai_based',  tkey: 'TKEY_FILTER_JIHAIBASED',   test: y => y.jihai_based === true },
    { id: 'on_win', tkey: 'TKEY_FILTER_ONWIN', test: y => y.on_win === true},
    { id: 'single_suit',  tkey: 'TKEY_FILTER_SINGLESUIT',   test: y => y.single_suit === true },
    { id: 'yaochuu',      tkey: 'TKEY_FILTER_YAOCHUUBASED', test: y => y.yaochuu_based === true },
    { id: 'rare',         tkey: 'TKEY_FILTER_RARE',         test: y => y.yakuman === true || y.rare === true },
    { id: 'yakuman',      tkey: 'TKEY_FILTER_YAKUMAN',      test: y => y.yakuman === true },
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

  /* ── Example tile rendering ────────────────────────────────── */
  function makeTileEl(code, rotated) {
    const wrap = document.createElement('span');
    wrap.className = 'tile-wrap' + (rotated ? ' tile-rotated' : '');

    const inner = document.createElement('span');
    inner.className = 'tile-inner';

    const front = document.createElement('img');
    front.src = 'assets/tiles/Front.svg';
    front.className = 'tile-front';
    front.alt = '';

    const face = document.createElement('img');
    face.src = 'assets/tiles/' + code + '.svg';
    face.className = 'tile-front';
    if (code !== "b") {
      face.className = 'tile-face';
    }
    face.alt = '';

    inner.appendChild(front);
    inner.appendChild(face);
    wrap.appendChild(inner);
    return wrap;
  }

  function makeGroupEl(children) {
    const wrap = document.createElement('span');
    wrap.className = 'tile-group-concealed';
    appendTokens(children, wrap);

    const iconWrap = document.createElement('span');
    iconWrap.className = 'concealed-icon';
    const iconImg = document.createElement('img');
    iconImg.src = 'assets/Concealed_icon.svg';
    iconImg.alt = 'concealed';
    iconWrap.appendChild(iconImg);
    wrap.appendChild(iconWrap);

    return wrap;
  }

  function appendTokens(tokens, parent) {
    for (const tok of tokens) {
      if (tok.type === 'tile') {
        parent.appendChild(makeTileEl(tok.code, tok.rotated));
      } else if (tok.type === 'space') {
        const sp = document.createElement('span');
        sp.className = 'tile-space';
        parent.appendChild(sp);
      } else if (tok.type === 'linebreak') {
        const br = document.createElement('div');
        br.className = 'tile-linebreak';
        parent.appendChild(br);
      } else if (tok.type === 'text') {
        parent.appendChild(document.createTextNode(tok.value));
      } else if (tok.type === 'group') {
        parent.appendChild(makeGroupEl(tok.children));
      }
    }
  }

  function pushTextTokens(str, out) {
    for (const ch of str) {
      if (ch === '\n') {
        out.push({ type: 'linebreak' });
      } else if (ch === ' ') {
        out.push({ type: 'space' });
      } else {
        const prev = out[out.length - 1];
        if (prev && prev.type === 'text') prev.value += ch;
        else out.push({ type: 'text', value: ch });
      }
    }
  }

  function parseFlat(str, out) {
    const re = /:([a-zA-Z0-9]+_?):/g;
    let last = 0, m;
    while ((m = re.exec(str)) !== null) {
      if (m.index > last) pushTextTokens(str.slice(last, m.index), out);
      const raw = m[1];
      const rotated = raw.endsWith('_');
      out.push({ type: 'tile', code: rotated ? raw.slice(0, -1) : raw, rotated });
      last = m.index + m[0].length;
    }
    if (last < str.length) pushTextTokens(str.slice(last), out);
  }

  function parseExample(str) {
    const tokens = [];
    const groupRe = /\(\([\s\S]*?\)\)/g;
    let last = 0, m;
    while ((m = groupRe.exec(str)) !== null) {
      if (m.index > last) parseFlat(str.slice(last, m.index), tokens);
      const children = [];
      parseFlat(m[0].slice(2, -2), children);
      tokens.push({ type: 'group', children });
      last = m.index + m[0].length;
    }
    if (last < str.length) parseFlat(str.slice(last), tokens);
    return tokens;
  }

  function buildExampleEl(rawStr) {
    const el = document.createElement('div');
    el.className = 'yaku-example';
    appendTokens(parseExample(interp(rawStr)), el);
    return el;
  }

  /* ── Card rendering ────────────────────────────────────────── */
  function renderCard(y) {
    const card = document.createElement('div');
    card.className = 'yaku-card' + (y.common ? ' is-common' : '');
    card.setAttribute('role', 'listitem');

    // Tags
    const tags = [];
    // if (y.yakuman)             tags.push({ text: t('TKEY_FILTER_YAKUMAN'), cls: 'ym' });
    if (y.common)              tags.push({ text: t('TKEY_TAG_COMMON'),  cls: 'com' });
    if (y.rare && !y.yakuman)  tags.push({ text: t('TKEY_FILTER_RARE'),   cls: 'rare' });
    if (y.not_yaku)            tags.push({ text: t('TKEY_TAG_NOTYAKU'),      cls: 'bonus' });

    const tagsHtml = tags.length
      ? '<div class="yaku-tags">' +
          tags.map(tg => '<span class="tag ' + tg.cls + '">' + tg.text + '</span>').join('') +
        '</div>'
      : '';

    const notesHtml = y.notes
      ? '<div class="yaku-notes">' + interp(y.notes) + '</div>'
      : '';

    card.innerHTML =
      '<div class="yaku-header">' +
        '<div class="yaku-name">' + interp(y.name) + '</div>' +
        '<div class="yaku-value">' + fmtValue(y) + '</div>' +
      '</div>' +
      '<div class="yaku-desc">' + interp(y.description) + '</div>' +
      notesHtml +
      tagsHtml;

    if (y.example) {
      const exampleEl = buildExampleEl(y.example);
      card.insertBefore(exampleEl, card.querySelector('.yaku-tags') || null);
    }

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
      const isOpen = menu.classList.toggle('open');
      if (isOpen) {
        const rect = btn.getBoundingClientRect();
        const menuWidth = 230;
        let left = rect.right - menuWidth;
        if (left < 8) left = rect.left;
        if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
        menu.style.top  = (rect.bottom + 6) + 'px';
        menu.style.left = left + 'px';
      }
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

  /* ── Bootstrap ─────────────────────────────────────────────── */
  async function init() {

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
