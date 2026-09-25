'use strict';

const electron = require('electron');
const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  globalShortcut,
  session,
  Tray,
  Menu,
  nativeImage,
  webContents,
} = electron;
const path = require('path');

// Tarayıcı kimliği (user agent) bilerek DEĞİŞTİRİLMEZ: Google, Chrome taklidi
// yapan gömülü tarayıcıları "bu tarayıcı güvenli olmayabilir" diyerek engelliyor;
// Electron'un kendi kimliğiyle giriş sorunsuz çalışıyor (th-ch/youtube-music'in
// varsayılan davranışıyla aynı).

// Bu alan adlarından açılan açılır pencereler (ör. "Google ile devam et") sistem
// tarayıcısına değil, uygulama içinde aynı oturumu paylaşan bir pencereye açılır;
// aksi hâlde giriş tamamlansa da uygulamaya geri dönmez.
const AUTH_POPUP_HOSTS = [
  'accounts.google.com',
  'accounts.youtube.com',
  'www.facebook.com',
  'facebook.com',
  'appleid.apple.com',
  'idmsa.apple.com',
  'accounts.spotify.com',
  'login.tidal.com',
  'auth.tidal.com',
  'connect.deezer.com',
  'secure.soundcloud.com',
  'api.soundcloud.com',
];

function isAuthPopupUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && AUTH_POPUP_HOSTS.some((h) => hostname === h);
  } catch {
    return false;
  }
}

const TRAY_ICON = path.join(__dirname, 'assets', 'tray.png');
const APP_ICON = path.join(__dirname, 'build', 'icon.png');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let trayHintShown = false;

// Tek örnek: uygulama tepside gizliyken kısayola tekrar tıklanınca ikinci bir
// kopya açmak yerine mevcut pencere öne getirilir.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showMainWindow());
}

function isSafeExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// Herhangi bir servis görünümünden ses çıkıyor mu?
function isAnythingPlaying() {
  return webContents
    .getAllWebContents()
    .some((wc) => wc.getType() === 'webview' && !wc.isDestroyed() && wc.isCurrentlyAudible());
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function sendMediaAction(action) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('media:key', action);
  }
}

function quitApp() {
  isQuitting = true;
  app.quit();
}

function hideToTray() {
  mainWindow.hide();
  if (!trayHintShown && tray && process.platform === 'win32') {
    trayHintShown = true;
    tray.displayBalloon({
      iconType: 'info',
      title: 'Aria Music arka planda çalıyor',
      content:
        'Müzik devam ediyor. Pencereyi açmak için tepsi simgesine tıkla; ' +
        'tamamen kapatmak için sağ tık → Çıkış.',
    });
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0d0f16',
    show: false,
    icon: APP_ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      spellcheck: false,
      // Pencere gizliyken de arayüz ve medya tuşu köprüsü tam hızda çalışsın
      backgroundThrottling: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-state', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-state', false);
  });

  // Kapat (X): bir şey çalıyorsa pencere tepsiye gizlenir ve müzik devam eder;
  // sessizse uygulama normal şekilde kapanır.
  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    if (isAnythingPlaying()) {
      event.preventDefault();
      hideToTray();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(TRAY_ICON));
  tray.setToolTip('Aria Music');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Aria Music'i göster", click: showMainWindow },
      { type: 'separator' },
      { label: 'Oynat / Duraklat', click: () => sendMediaAction('playpause') },
      { label: 'Sonraki parça', click: () => sendMediaAction('next') },
      { label: 'Önceki parça', click: () => sendMediaAction('prev') },
      { type: 'separator' },
      { label: 'Çıkış', click: quitApp },
    ])
  );
  tray.on('click', showMainWindow);
  tray.on('double-click', showMainWindow);
}

// Her webview için ortak güvenlik/davranış kuralları:
// - Giriş sağlayıcılarının açılır pencereleri uygulama içinde açılır (oturumu paylaşır).
// - Diğer tüm yeni pencere istekleri kullanıcının kendi tarayıcısına yönlendirilir.
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url }) => {
      if (isAuthPopupUrl(url)) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 540,
            height: 760,
            autoHideMenuBar: true,
            backgroundColor: '#0d0f16',
            icon: APP_ICON,
          },
        };
      }
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  }
});

function registerMediaKeys() {
  globalShortcut.register('MediaPlayPause', () => sendMediaAction('playpause'));
  globalShortcut.register('MediaNextTrack', () => sendMediaAction('next'));
  globalShortcut.register('MediaPreviousTrack', () => sendMediaAction('prev'));
}

app.whenReady().then(async () => {
  // castlabs Electron kullanılıyorsa Widevine CDM bileşeninin hazır olmasını
  // bekle: Spotify, Apple Music ve TIDAL'ın DRM'li içerik çalabilmesi için gerekli.
  if (electron.components) {
    try {
      await electron.components.whenReady();
    } catch (err) {
      console.error('Widevine bileşeni yüklenemedi (DRM içerik çalmayabilir):', err);
    }
  }

  createMainWindow();
  createTray();
  registerMediaKeys();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      showMainWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- IPC: pencere kontrolleri ve yardımcılar ----

ipcMain.on('window:minimize', () => mainWindow?.minimize());

ipcMain.on('window:toggle-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window:close', () => mainWindow?.close());

ipcMain.handle('app:open-external', (_event, url) => {
  if (isSafeExternalUrl(url)) {
    return shell.openExternal(url);
  }
  return Promise.resolve();
});

// Verilen bölümlerin (partition) tüm oturum verisini (çerez, depolama, önbellek) siler.
const PARTITION_RE = /^(persist:|inmemory-)[a-z0-9-]+$/;

ipcMain.handle('app:clear-sessions', async (_event, partitions) => {
  if (!Array.isArray(partitions)) return;
  for (const name of partitions) {
    if (typeof name !== 'string' || !PARTITION_RE.test(name)) continue;
    const ses = session.fromPartition(name);
    await ses.clearStorageData();
    await ses.clearCache();
  }
});
