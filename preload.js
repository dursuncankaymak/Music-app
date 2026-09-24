'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aria', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),

  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  getUserAgent: () => ipcRenderer.invoke('app:get-user-agent'),

  onMaximizedState: (callback) => {
    ipcRenderer.on('window:maximized-state', (_event, maximized) => callback(maximized));
  },
  onMediaKey: (callback) => {
    ipcRenderer.on('media:key', (_event, action) => callback(action));
  },
});
