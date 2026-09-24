'use strict';

/* global SERVICES, Capacitor */

(() => {
  const LAST_SERVICE_KEY = 'aria.lastService';
  const TOOLBAR_COLOR = '#0d0f16';

  // Capacitor'ın yerel köprüsü varsa Chrome Custom Tabs, yoksa (tarayıcıda
  // test ederken) normal bir sekme kullanılır.
  const Browser =
    typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()
      ? Capacitor.registerPlugin('Browser')
      : null;

  const el = {
    grid: document.getElementById('service-grid'),
    resume: document.getElementById('resume'),
    resumeBtn: document.getElementById('resume-btn'),
    resumeIcon: document.getElementById('resume-icon'),
    resumeName: document.getElementById('resume-name'),
  };

  const getService = (id) => SERVICES.find((s) => s.id === id);

  async function openService(service) {
    try {
      localStorage.setItem(LAST_SERVICE_KEY, service.id);
    } catch { /* depolama kullanılamıyor */ }
    renderResume();

    if (Browser) {
      await Browser.open({ url: service.url, toolbarColor: TOOLBAR_COLOR });
    } else {
      window.open(service.url, '_blank', 'noopener');
    }
  }

  function renderResume() {
    let lastId = null;
    try {
      lastId = localStorage.getItem(LAST_SERVICE_KEY);
    } catch { /* depolama kullanılamıyor */ }

    const service = lastId ? getService(lastId) : null;
    if (!service) {
      el.resume.classList.add('hidden');
      return;
    }
    el.resumeIcon.innerHTML = service.icon;
    el.resumeIcon.style.setProperty('--service-color', service.color);
    el.resumeName.textContent = service.name;
    el.resumeBtn.onclick = () => openService(service);
    el.resume.classList.remove('hidden');
  }

  function renderGrid() {
    SERVICES.forEach((service) => {
      const card = document.createElement('button');
      card.className = 'service-card';
      card.style.setProperty('--service-color', service.color);
      card.innerHTML = `
        <span class="service-icon">${service.icon}</span>
        <span class="service-name">${service.name}</span>
      `;
      card.addEventListener('click', () => openService(service));
      el.grid.appendChild(card);
    });
  }

  renderGrid();
  renderResume();
})();
