'use strict';

/* global SERVICES */

(() => {
  // ---- Ayarlar ----
  const SETTINGS_KEY = 'aria.settings';
  // memorySaver: arka planda sessiz kalan servisler sleepAfterMinutes sonra uyutulur
  // (sayfa kapatılır, belleği boşalır; oturum korunur, tıklayınca yeniden yüklenir).
  const defaultSettings = { rememberSessions: true, memorySaver: true, sleepAfterMinutes: 5 };

  function loadSettings() {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    } catch {
      return { ...defaultSettings };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch { /* depolama kullanılamıyor */ }
  }

  const settings = loadSettings();

  // ---- Durum ----
  let activeServiceId = null;
  let windowVisible = true;
  const webviews = new Map(); // serviceId -> <webview>
  const lastUsedAt = new Map(); // serviceId -> son görüntülenme / ses çalma zamanı

  // ---- Element referansları ----
  const el = {
    serviceList: document.getElementById('service-list'),
    homeCards: document.getElementById('home-cards'),
    home: document.getElementById('home'),
    views: document.getElementById('views'),
    toolbar: document.getElementById('toolbar'),
    titlebarService: document.getElementById('titlebar-service'),
    loading: document.getElementById('loading-indicator'),
    navBack: document.getElementById('nav-back'),
    navForward: document.getElementById('nav-forward'),
    navReload: document.getElementById('nav-reload'),
    navExternal: document.getElementById('nav-external'),
    errorScreen: document.getElementById('error-screen'),
    errorDetail: document.getElementById('error-detail'),
    errorRetry: document.getElementById('error-retry'),
    btnMinimize: document.getElementById('btn-minimize'),
    btnMaximize: document.getElementById('btn-maximize'),
    btnClose: document.getElementById('btn-close'),
    toggleRemember: document.getElementById('toggle-remember'),
    btnClearSessions: document.getElementById('btn-clear-sessions'),
    privacyNote: document.getElementById('privacy-note'),
    homeSub: document.getElementById('home-sub'),
    toggleMemorySaver: document.getElementById('toggle-memory-saver'),
    toggleHwAccel: document.getElementById('toggle-hw-accel'),
  };

  const getService = (id) => SERVICES.find((s) => s.id === id);
  const getActiveWebview = () => (activeServiceId ? webviews.get(activeServiceId) : null);

  // ---- Pencere kontrolleri ----
  el.btnMinimize.addEventListener('click', () => window.aria.minimize());
  el.btnMaximize.addEventListener('click', () => window.aria.toggleMaximize());
  el.btnClose.addEventListener('click', () => window.aria.close());
  window.aria.onMaximizedState((maximized) => {
    document.body.classList.toggle('maximized', maximized);
  });

  // ---- Kenar çubuğu ve karşılama kartları ----
  function buildSidebar() {
    SERVICES.forEach((service, index) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'service-item';
      btn.dataset.serviceId = service.id;
      btn.style.setProperty('--service-color', service.color);
      btn.title = `${service.name}  (Ctrl+${index + 1})`;
      btn.innerHTML = `
        <span class="service-icon">${service.icon}</span>
        <span class="service-name">${service.name}</span>
        <span class="service-live-dot"></span>
      `;
      btn.addEventListener('click', () => activateService(service.id));
      li.appendChild(btn);
      el.serviceList.appendChild(li);
    });
  }

  function buildHomeCards() {
    SERVICES.forEach((service) => {
      const card = document.createElement('button');
      card.className = 'home-card';
      card.style.setProperty('--service-color', service.color);
      card.innerHTML = `
        <span class="service-icon" style="color:${service.color}">${service.icon}</span>
        <span class="card-name">${service.name}</span>
      `;
      card.addEventListener('click', () => activateService(service.id));
      el.homeCards.appendChild(card);
    });
  }

  // ---- Webview yönetimi ----
  // "Oturumları hatırla" açıkken "persist:" bölümü kullanılır: girişler diske
  // (Chromium'un şifreli çerez deposuna) yazılır ve yeniden açılışta hatırlanır.
  // Kapalıyken bölüm yalnızca bellekte yaşar, uygulama kapanınca silinir.
  function partitionFor(service) {
    return settings.rememberSessions ? `persist:${service.id}` : `inmemory-${service.id}`;
  }

  function createWebview(service) {
    const wv = document.createElement('webview');
    wv.setAttribute('src', service.url);
    wv.setAttribute('partition', partitionFor(service));
    wv.setAttribute('allowpopups', '');
    // Pencere tepsiye gizlendiğinde oynatıcı zamanlayıcıları kısılmasın;
    // parça geçişleri ve otomatik oynatma arka planda da aksamadan sürsün.
    wv.setAttribute('webpreferences', 'backgroundThrottling=no');
    wv.dataset.serviceId = service.id;

    wv.addEventListener('media-started-playing', () => touch(service.id));
    wv.addEventListener('media-paused', () => touch(service.id));

    wv.addEventListener('did-start-loading', () => {
      if (service.id === activeServiceId) el.loading.classList.remove('hidden');
    });

    wv.addEventListener('did-stop-loading', () => {
      if (service.id === activeServiceId) {
        el.loading.classList.add('hidden');
        updateNavButtons();
      }
      sidebarItem(service.id)?.classList.add('loaded');
    });

    wv.addEventListener('did-navigate', () => {
      if (service.id === activeServiceId) updateNavButtons();
    });
    wv.addEventListener('did-navigate-in-page', () => {
      if (service.id === activeServiceId) updateNavButtons();
    });

    wv.addEventListener('did-fail-load', (e) => {
      // -3 (ERR_ABORTED) SPA yönlendirmelerinde normaldir, hata sayılmaz.
      if (e.errorCode === -3 || !e.isMainFrame) return;
      if (service.id === activeServiceId) {
        el.errorDetail.textContent =
          `${service.name} yüklenemedi (${e.errorDescription || 'bilinmeyen hata'}). ` +
          'İnternet bağlantını kontrol edip tekrar dene.';
        el.errorScreen.classList.remove('hidden');
      }
    });

    el.views.appendChild(wv);
    webviews.set(service.id, wv);
    return wv;
  }

  function sidebarItem(serviceId) {
    return el.serviceList.querySelector(`[data-service-id="${serviceId}"]`);
  }

  function activateService(serviceId) {
    const service = getService(serviceId);
    if (!service) return;

    // Bırakılan servisin uyku sayacı şimdi başlar
    if (activeServiceId && activeServiceId !== serviceId) touch(activeServiceId);
    activeServiceId = serviceId;
    touch(serviceId);
    el.errorScreen.classList.add('hidden');

    // Kenar çubuğu aktiflik durumu
    el.serviceList.querySelectorAll('.service-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.serviceId === serviceId);
    });

    // Karşılama ekranını gizle, araç çubuğunu göster
    el.home.classList.add('hidden');
    el.toolbar.classList.remove('hidden');
    el.titlebarService.textContent = service.name;

    // Webview'i getir (yoksa ya da uyuyorsa oluştur)
    const wv = webviews.get(serviceId) || createWebview(service);
    setSleeping(serviceId, false);
    webviews.forEach((view) => view.classList.remove('active'));
    wv.classList.add('active');

    el.loading.classList.toggle('hidden', !safeIsLoading(wv));
    updateNavButtons();
  }

  function safeIsLoading(wv) {
    // Webview DOM'a yeni eklendiyse API'si henüz hazır olmayabilir.
    try {
      return wv.isLoading();
    } catch {
      return true;
    }
  }

  function updateNavButtons() {
    const wv = getActiveWebview();
    let canBack = false;
    let canForward = false;
    try {
      canBack = wv ? wv.canGoBack() : false;
      canForward = wv ? wv.canGoForward() : false;
    } catch {
      // Webview henüz hazır değil.
    }
    el.navBack.disabled = !canBack;
    el.navForward.disabled = !canForward;
  }

  // ---- Uyku modu ----
  function touch(serviceId) {
    lastUsedAt.set(serviceId, Date.now());
  }

  function isAudible(wv) {
    try {
      return wv.isCurrentlyAudible();
    } catch {
      return false;
    }
  }

  function setSleeping(serviceId, sleeping) {
    const item = sidebarItem(serviceId);
    if (!item) return;
    const service = getService(serviceId);
    const index = SERVICES.indexOf(service);
    item.classList.toggle('sleeping', sleeping);
    item.title = sleeping
      ? `${service.name} — uyuyor, belleği boşaltıldı. Tıklayınca yeniden açılır.`
      : `${service.name}  (Ctrl+${index + 1})`;
  }

  // Servisin sayfasını kapatır: süreci sonlanır ve belleği işletim sistemine döner.
  // Oturum (giriş) bölümde kaldığı için yeniden açıldığında giriş yapmak gerekmez.
  function sleepService(serviceId) {
    const wv = webviews.get(serviceId);
    if (!wv) return;
    wv.remove();
    webviews.delete(serviceId);
    lastUsedAt.delete(serviceId);
    sidebarItem(serviceId)?.classList.remove('loaded');
    setSleeping(serviceId, true);
  }

  function checkIdleServices() {
    if (!settings.memorySaver) return;
    const limit = settings.sleepAfterMinutes * 60 * 1000;
    const now = Date.now();
    webviews.forEach((wv, serviceId) => {
      const onScreen = serviceId === activeServiceId && windowVisible;
      if (onScreen || isAudible(wv)) {
        touch(serviceId);
      } else if (now - (lastUsedAt.get(serviceId) ?? now) >= limit) {
        sleepService(serviceId);
      }
    });
  }

  setInterval(checkIdleServices, 30 * 1000);

  window.aria.onWindowVisibility((visible) => {
    windowVisible = visible;
    if (!visible) {
      if (activeServiceId) touch(activeServiceId);
      return;
    }
    // Pencere gizliyken uyutulan aktif servis, pencere açılınca uyanır
    if (activeServiceId && !webviews.has(activeServiceId)) activateService(activeServiceId);
  });

  // ---- Araç çubuğu ----
  el.navBack.addEventListener('click', () => {
    const wv = getActiveWebview();
    try { if (wv?.canGoBack()) wv.goBack(); } catch { /* hazır değil */ }
  });

  el.navForward.addEventListener('click', () => {
    const wv = getActiveWebview();
    try { if (wv?.canGoForward()) wv.goForward(); } catch { /* hazır değil */ }
  });

  el.navReload.addEventListener('click', () => {
    el.errorScreen.classList.add('hidden');
    try { getActiveWebview()?.reload(); } catch { /* hazır değil */ }
  });

  el.navExternal.addEventListener('click', () => {
    const wv = getActiveWebview();
    const service = getService(activeServiceId);
    let url = service ? service.url : null;
    try {
      const current = wv?.getURL();
      if (current) url = current;
    } catch { /* hazır değil */ }
    if (url) window.aria.openExternal(url);
  });

  el.errorRetry.addEventListener('click', () => {
    el.errorScreen.classList.add('hidden');
    try { getActiveWebview()?.reload(); } catch { /* hazır değil */ }
  });

  // ---- Oturum ayarları ----
  function updatePrivacyNote() {
    el.privacyNote.textContent = settings.rememberSessions
      ? 'Girişlerin bu bilgisayarda şifreli olarak saklanır ve her açılışta hatırlanır.'
      : 'Oturumlar yalnızca bellekte tutulur; uygulama kapanınca tamamen silinir.';
    el.homeSub.textContent = settings.rememberSessions
      ? 'Bir servis seç ve dinlemeye başla. Bir kez giriş yapman yeterli — uygulama seni her açılışta hatırlar.'
      : 'Bir servis seç ve dinlemeye başla. Oturumun yalnızca bellekte tutulur — uygulama kapanınca hiçbir iz kalmaz.';
  }

  // Tüm webview'leri yıkıp aktif servisi yeni bölüm ayarıyla yeniden açar.
  function rebuildWebviews() {
    webviews.forEach((wv) => wv.remove());
    webviews.clear();
    lastUsedAt.clear();
    el.serviceList.querySelectorAll('.service-item').forEach((item) => {
      item.classList.remove('loaded');
      setSleeping(item.dataset.serviceId, false);
    });
    if (activeServiceId) activateService(activeServiceId);
  }

  el.toggleRemember.addEventListener('change', () => {
    settings.rememberSessions = el.toggleRemember.checked;
    saveSettings();
    updatePrivacyNote();
    rebuildWebviews();
  });

  el.toggleMemorySaver.addEventListener('change', () => {
    settings.memorySaver = el.toggleMemorySaver.checked;
    saveSettings();
    if (settings.memorySaver) webviews.forEach((_wv, serviceId) => touch(serviceId));
  });

  el.toggleHwAccel.addEventListener('change', async () => {
    await window.aria.setHardwareAcceleration(el.toggleHwAccel.checked);
    const now = window.confirm(
      'Bu ayar uygulama yeniden başlatılınca geçerli olur. Şimdi yeniden başlatılsın mı?'
    );
    if (now) window.aria.relaunch();
  });

  el.btnClearSessions.addEventListener('click', async () => {
    const onay = window.confirm(
      'Tüm servislerdeki girişler, çerezler ve önbellek silinecek. Emin misin?'
    );
    if (!onay) return;
    const partitions = SERVICES.flatMap((s) => [`persist:${s.id}`, `inmemory-${s.id}`]);
    await window.aria.clearSessions(partitions);
    rebuildWebviews();
  });

  // ---- Medya tuşları ----
  // Aktif servisin oynatıcı butonuna tıklamayı dener; bulamazsa sayfadaki
  // <video>/<audio> öğesini doğrudan oynatır/duraklatır.
  function buildMediaScript(selectors, action) {
    const selectorsJson = JSON.stringify(selectors || []);
    return `
      (() => {
        const selectors = ${selectorsJson};
        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn) { btn.click(); return true; }
        }
        if (${JSON.stringify(action)} === 'playpause') {
          const media = document.querySelector('video, audio');
          if (media) {
            if (media.paused) { media.play(); } else { media.pause(); }
            return true;
          }
        }
        return false;
      })();
    `;
  }

  window.aria.onMediaKey((action) => {
    const wv = getActiveWebview();
    const service = getService(activeServiceId);
    if (!service) return;
    if (!wv) {
      // Aktif servis uyuyorsa medya tuşu onu uyandırır
      activateService(activeServiceId);
      return;
    }
    const selectors = service.controls ? service.controls[action] : [];
    try {
      wv.executeJavaScript(buildMediaScript(selectors, action)).catch(() => {});
    } catch { /* hazır değil */ }
  });

  // ---- Klavye kısayolları: Ctrl+1..9 ile servis değiştir ----
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= SERVICES.length) {
        e.preventDefault();
        activateService(SERVICES[num - 1].id);
      }
    }
  });

  // ---- Başlat ----
  async function init() {
    el.toggleRemember.checked = settings.rememberSessions;
    el.toggleMemorySaver.checked = settings.memorySaver;
    el.toggleHwAccel.checked = await window.aria.getHardwareAcceleration();
    updatePrivacyNote();
    buildSidebar();
    buildHomeCards();
  }

  init();
})();
