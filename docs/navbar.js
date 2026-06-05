(function () {
  'use strict';

  function initTheme() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
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

  document.addEventListener('DOMContentLoaded', initTheme);
}());
