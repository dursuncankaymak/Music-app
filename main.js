'use strict';

const { app, BrowserWindow, ipcMain, shell, globalShortcut } = require('electron');
const path = require('path');

// Web servislerinin (özellikle Google girişinin) Electron'u engellememesi için
// güncel bir Chrome tarayıcısı gibi görünürüz.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

let mainWindow = null;

function isSafeExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      spellcheck: false,
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
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Her webview için ortak güvenlik/davranış kuralları:
// - Yeni pencere açma istekleri (window.open, hedefli linkler) uygulama içinde
//   yeni pencere oluşturmak yerine kullanıcının kendi tarayıcısında açılır.
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url }) => {
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  }
});

function registerMediaKeys() {
  const send = (action) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media:key', action);
    }
  };
  globalShortcut.register('MediaPlayPause', () => send('playpause'));
  globalShortcut.register('MediaNextTrack', () => send('next'));
  globalShortcut.register('MediaPreviousTrack', () => send('prev'));
}

app.whenReady().then(() => {
  createMainWindow();
  registerMediaKeys();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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

ipcMain.handle('app:get-user-agent', () => USER_AGENT);
