/* ardh-logo-shared-v1 */
(function () {
  function init() {
    document.querySelectorAll('.ardh-medallion-nav, .ardh-hero-medallion').forEach(function (el) {
      el.addEventListener('click', function (e) {
        el.classList.remove('ardh-spin'); void el.offsetWidth; el.classList.add('ardh-spin');
      });
      el.addEventListener('animationend', function (e) {
        if (e.animationName === 'ardhLogoSpinShared') el.classList.remove('ardh-spin');
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
