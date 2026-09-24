'use strict';

/* global SERVICES, Capacitor */

(() => {
  const LAST_SERVICE_KEY = 'aria.lastService';
  const TOOLBAR_COLOR = '#0d0f16';

  // Capacitor'ın yerel köprüsü varsa eklentiler kullanılır; tarayıcıda test
  // ederken servisler normal bir sekmede açılır.
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  const Browser = isNative ? Capacitor.registerPlugin('Browser') : null;
  const AppLauncher = isNative ? Capacitor.registerPlugin('AppLauncher') : null;

  // Telefonda yüklü olduğu tespit edilen servis uygulamaları (service.id)
  const installedApps = new Set();

  const el = {
    grid: document.getElementById('service-grid'),
    resume: document.getElementById('resume'),
    resumeBtn: document.getElementById('resume-btn'),
    resumeIcon: document.getElementById('resume-icon'),
    resumeName: document.getElementById('resume-name'),
    resumeHint: document.getElementById('resume-hint'),
  };

  const getService = (id) => SERVICES.find((s) => s.id === id);

  // Servisin yerel uygulaması yüklüyse onu açar (arka planda çalma, bildirim
  // kontrolleri vb. orada zaten vardır); değilse Chrome Custom Tab ile açar.
  async function openService(service) {
    try {
      localStorage.setItem(LAST_SERVICE_KEY, service.id);
    } catch { /* depolama kullanılamıyor */ }
    renderResume();

    if (AppLauncher && installedApps.has(service.id)) {
      try {
        const { completed } = await AppLauncher.openUrl({ url: service.androidPackage });
        if (completed) return;
      } catch { /* uygulama açılamadı, web'e düş */ }
    }

    if (Browser) {
      await Browser.open({ url: service.url, toolbarColor: TOOLBAR_COLOR });
    } else {
      window.open(service.url, '_blank', 'noopener');
    }
  }

  async function detectInstalledApps() {
    if (!AppLauncher) return;
    await Promise.all(
      SERVICES.filter((s) => s.androidPackage).map(async (service) => {
        try {
          const { value } = await AppLauncher.canOpenUrl({ url: service.androidPackage });
          if (value) installedApps.add(service.id);
        } catch { /* eklenti yok ya da paket görünmüyor */ }
      })
    );
    el.grid.querySelectorAll('.service-card').forEach((card) => {
      card.classList.toggle('installed', installedApps.has(card.dataset.serviceId));
    });
    renderResume();
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
    el.resumeHint.textContent = installedApps.has(service.id) ? 'Uygulamada açılır' : "Chrome'da açılır";
    el.resumeBtn.onclick = () => openService(service);
    el.resume.classList.remove('hidden');
  }

  function renderGrid() {
    SERVICES.forEach((service) => {
      const card = document.createElement('button');
      card.className = 'service-card';
      card.dataset.serviceId = service.id;
      card.style.setProperty('--service-color', service.color);
      card.innerHTML = `
        <span class="service-icon">${service.icon}</span>
        <span class="service-name">${service.name}</span>
        <span class="card-badge">Uygulama</span>
      `;
      card.addEventListener('click', () => openService(service));
      el.grid.appendChild(card);
    });
  }

  renderGrid();
  renderResume();
  detectInstalledApps();
})();
