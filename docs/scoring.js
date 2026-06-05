(function () {
  'use strict';

  /* ── State ──────────────────────────────────────────────────── */
  const state = {
    isOya: false,
    isRon: true,
    kiriagemangan: false,
    kazoeYakuman: false,
    fu: null,
    han: null,
  };

  const FU_VALUES  = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
  const HAN_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

  /* ── Scoring logic ──────────────────────────────────────────── */
  function roundUp100(n) {
    return Math.ceil(n / 100) * 100;
  }

  function calcScore(han, fu, isOya, isRon, kiriagemangan, kazoeYakuman) {
    let base = fu * Math.pow(2, han + 2);
    let limitName  = null;
    let limitClass = null;

    // Determine limit hand by han count first, then by base points
    if (han >= 13 && kazoeYakuman) {
      base = 8000; limitName = 'Kazoe Yakuman'; limitClass = 'yakuman';
    } else if (han >= 11) {
      // 13 han without kazoe falls here too (scored as sanbaiman)
      base = 6000; limitName = 'Sanbaiman'; limitClass = 'sanbaiman';
    } else if (han >= 8) {
      base = 4000; limitName = 'Baiman'; limitClass = 'baiman';
    } else if (han >= 6) {
      base = 3000; limitName = 'Haneman'; limitClass = 'haneman';
    } else if (han >= 5 || base >= 2000) {
      base = 2000; limitName = 'Mangan'; limitClass = 'mangan';
    } else if (kiriagemangan && base >= 1920) {
      // Kiriage mangan: 3-han 60-fu (1920) and 4-han 30-fu (1920) round up
      base = 2000; limitName = 'Mangan'; limitClass = 'mangan';
    }

    let display;
    if (isOya) {
      if (isRon) {
        display = String(roundUp100(base * 6));
      } else {
        display = roundUp100(base * 2) + ' all';
      }
    } else {
      if (isRon) {
        display = String(roundUp100(base * 4));
      } else {
        const ko  = roundUp100(base);
        const oya = roundUp100(base * 2);
        display = ko + ' / ' + oya;
      }
    }

    return { display, limitName, limitClass };
  }

  /* ── UI helpers ─────────────────────────────────────────────── */
  function buildChipGrid(gridId, values, stateKey) {
    const grid = document.getElementById(gridId);
    values.forEach(v => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = v;
      chip.dataset.value = v;
      chip.addEventListener('click', () => {
        state[stateKey] = v;
        grid.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });
      grid.appendChild(chip);
    });
  }

  function initBtnGroup(groupId, onSelect) {
    const group = document.getElementById(groupId);
    group.querySelectorAll('.btn-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.btn-opt').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        onSelect(btn.dataset.value);
      });
    });
  }

  function initToggleSwitch(id, stateKey) {
    const btn = document.getElementById(id);
    btn.addEventListener('click', () => {
      state[stateKey] = !state[stateKey];
      btn.setAttribute('aria-checked', state[stateKey] ? 'true' : 'false');
    });
  }

  function revealResult() {
    const placeholder = document.getElementById('result-placeholder');
    if (placeholder) placeholder.hidden = true;
    document.getElementById('calc-result').hidden = false;
  }

  function showResult(result) {
    const scoreEl = document.getElementById('result-score');
    const metaEl  = document.getElementById('result-meta');

    scoreEl.textContent = result.display;

    const seat    = state.isOya ? 'Oya' : 'Non-oya';
    const win     = state.isRon ? 'Ron' : 'Tsumo';
    const context = seat + ' ' + win + ' \u00B7 ' + state.han + ' han ' + state.fu + ' fu';

    let html = '';
    if (result.limitName) {
      html += '<span class="result-limit ' + result.limitClass + '">' + result.limitName + '</span><br>';
    }
    html += context;
    metaEl.innerHTML = html;

    revealResult();
  }

  function showError(msg) {
    const scoreEl = document.getElementById('result-score');
    const metaEl  = document.getElementById('result-meta');
    scoreEl.textContent = '';
    metaEl.textContent = msg;
    revealResult();
  }

  /* ── Bootstrap ──────────────────────────────────────────────── */
  function init() {
    buildChipGrid('fu-grid',  FU_VALUES,  'fu');
    buildChipGrid('han-grid', HAN_VALUES, 'han');

    initBtnGroup('seat-group', value => { state.isOya = value === 'oya'; });
    initBtnGroup('win-group',  value => { state.isRon = value === 'ron'; });

    initToggleSwitch('kiriage-toggle', 'kiriagemangan');
    initToggleSwitch('kazoe-toggle',   'kazoeYakuman');

    document.getElementById('calc-btn').addEventListener('click', () => {
      if (state.fu === null || state.han === null) {
        showError('Select a fu value and a han value first.');
        return;
      }
      const result = calcScore(
        state.han, state.fu,
        state.isOya, state.isRon,
        state.kiriagemangan, state.kazoeYakuman
      );
      showResult(result);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
}());
