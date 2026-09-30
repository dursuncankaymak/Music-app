'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aria', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),

  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  clearSessions: (partitions) => ipcRenderer.invoke('app:clear-sessions', partitions),
  getHardwareAcceleration: () => ipcRenderer.invoke('app:get-hardware-acceleration'),
  setHardwareAcceleration: (enabled) => ipcRenderer.invoke('app:set-hardware-acceleration', enabled),
  relaunch: () => ipcRenderer.send('app:relaunch'),

  onMaximizedState: (callback) => {
    ipcRenderer.on('window:maximized-state', (_event, maximized) => callback(maximized));
  },
  onWindowVisibility: (callback) => {
    ipcRenderer.on('window:visibility', (_event, visible) => callback(visible));
  },
  onMediaKey: (callback) => {
    ipcRenderer.on('media:key', (_event, action) => callback(action));
  },
});
