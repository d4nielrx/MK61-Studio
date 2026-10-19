const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mk61app', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (cfg) => ipcRenderer.invoke('config:set', cfg),
  configPath: () => ipcRenderer.invoke('config:path'),
  getAutostart: () => ipcRenderer.invoke('autostart:get'),
  setAutostart: (enable) => ipcRenderer.invoke('autostart:set', enable),
  quit: () => ipcRenderer.invoke('app:quit'),
  version: () => ipcRenderer.invoke('app:version'),
  platform: () => ipcRenderer.invoke('app:platform'),
  log: (msg) => ipcRenderer.invoke('app:log', msg),
  // node-hid transport (main process)
  hidConnect: () => ipcRenderer.invoke('hid:connect'),
  hidSend: (bytes) => ipcRenderer.invoke('hid:send', bytes),
  hidRecv: () => ipcRenderer.invoke('hid:recv'),
  hidClose: () => ipcRenderer.invoke('hid:close'),
  onHidDetached: (cb) => ipcRenderer.on('hid:detached', () => cb()),
});
