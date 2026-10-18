/* Responsive navbar: hamburger toggle (Super Admin / Company Admin dashboards) */
(function () {
  'use strict';
  var BREAKPOINT = 1440;

  function init() {
    var nav = document.querySelector('header.navbar');
    var btn = nav && nav.querySelector('.nav-toggle');
    var panel = nav && nav.querySelector('.nav-actions');
    if (!nav || !btn || !panel) return;

    function setOpen(open) {
      nav.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (!open && typeof window.closeThemeMenu === 'function') window.closeThemeMenu();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!nav.classList.contains('nav-open'));
    });

    panel.addEventListener('click', function (e) {
      if (window.innerWidth > BREAKPOINT) return;
      var t = e.target.closest('.btn-runtime-refresh, .btn-danger, a[href], .theme-option-item');
      if (t) setTimeout(function () { setOpen(false); }, 120);
    });

    document.addEventListener('click', function (e) {
      if (nav.classList.contains('nav-open') && !nav.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('nav-open')) { setOpen(false); btn.focus(); }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > BREAKPOINT && nav.classList.contains('nav-open')) setOpen(false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* Logo: click / tap = 3D coin spin */
(function () {
  function initLogoSpin() {
    var logo = document.querySelector('header.navbar .ardh-medallion-nav');
    if (!logo) return;
    logo.addEventListener('click', function () {
      logo.classList.remove('logo-spin');
      void logo.offsetWidth;
      logo.classList.add('logo-spin');
    });
    logo.addEventListener('animationend', function (e) {
      if (e.animationName === 'ardhLogoSpin') logo.classList.remove('logo-spin');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLogoSpin);
  else initLogoSpin();
})();
