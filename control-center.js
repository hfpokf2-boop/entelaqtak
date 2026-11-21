/* Entelaqtak Control Center — small, dependency-free dashboard helpers */
(() => {
  'use strict';

  const dateNode = document.getElementById('controlCenterDate');
  if (!dateNode) return;

  const renderDate = () => {
    try {
      const options = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      };
      dateNode.textContent = new Intl.DateTimeFormat('ar-EG', options).format(new Date());
    } catch (_) {
      dateNode.textContent = new Date().toLocaleDateString();
    }
  };

  renderDate();
  window.addEventListener('pageshow', renderDate);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderDate();
  });
})();
