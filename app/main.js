const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const CONFIG_PATH = () => path.join(app.getPath('userData'), 'mk61-studio-config.json');
const SHORTCUT_PATH = () => path.join(
  app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'MK61 Studio.lnk'
);

let win = null;

const LOG_PATH = () => path.join(app.getPath('userData'), 'mk61-studio.log');
function appLog(msg) {
  try { fs.appendFileSync(LOG_PATH(), `${new Date().toISOString()} ${msg}\n`); } catch { /* ignore */ }
}

appLog(`[main] app started, electron ${process.versions.electron}, pid ${process.pid}`);

// Only one instance may talk to the keyboard at a time — two instances would
// fight over the HID handle, which looks exactly like a dead connection.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
}

// ---------- HID transport (node-hid in main process) ----------
// WebHID in Electron/Chromium fails receiveFeatureReport on this device
// (NotAllowedError) even though raw Win32 calls work — so we use the same
// hidapi stack the official Gamakay driver uses, verified working live.
const { HID, devices: hidDevices } = require('node-hid');
let hidDev = null;

function findConfigInterface() {
  return hidDevices().find(
    (d) => d.vendorId === 0x1ea7 && d.productId === 0x9018 && d.usagePage === 0xff01 && d.usage === 1
  );
}

ipcMain.handle('hid:connect', async () => {
  try {
    const cfg = findConfigInterface();
    if (!cfg) return { ok: false, error: 'MK61 config interface (MI_02) not found' };
    hidDev = new HID(cfg.path);
    if (typeof hidDev.on === 'function') {
      hidDev.on('detach', () => {
        appLog('[main] HID device detached');
        hidDev = null;
        win?.webContents.send('hid:detached');
      });
    }
    appLog(`[main] HID opened: ${cfg.product} path=${cfg.path}`);
    return { ok: true, product: cfg.product };
  } catch (e) {
    appLog(`[main] HID open failed: ${e?.message || e}`);
    return { ok: false, error: String(e?.message || e) };
  }
});
// Any failed I/O on a feature-report handle means the handle is dead (e.g.
// keyboard unplugged while the app was running — node-hid often does NOT
// fire 'detach'). Instead of letting every later command throw confusing OS
// errors (the "zombie connection"), tear down and tell the renderer so the
// UI flips to "reconnect" state immediately.
function dropConnection(reason) {
  try { hidDev?.close(); } catch { /* ignore */ }
  hidDev = null;
  appLog(`[main] HID connection dropped: ${reason}`);
  win?.webContents.send('hid:detached');
}

ipcMain.handle('hid:send', (_e, bytes) => {
  try {
    if (!hidDev) { dropConnection('send while closed'); return { ok: false, error: 'not connected' }; }
    appLog(`[main] hid:send head=${Array.from(bytes.slice(0, 6)).join(',')}`);
    hidDev.sendFeatureReport(bytes);
    return { ok: true };
  } catch (e) {
    const msg = String(e?.message || e);
    appLog(`[main] hid:send FAILED: ${msg}`);
    dropConnection(msg);
    return { ok: false, error: msg };
  }
});
ipcMain.handle('hid:recv', () => {
  try {
    if (!hidDev) { dropConnection('recv while closed'); return { ok: false, error: 'not connected' }; }
    const data = hidDev.getFeatureReport(0x07, 264);
    appLog(`[main] hid:recv head=${Array.from(data.slice(0, 4)).join(',')}`);
    return { ok: true, data: Array.from(data) };
  } catch (e) {
    const msg = String(e?.message || e);
    appLog(`[main] hid:recv FAILED: ${msg}`);
    dropConnection(msg);
    return { ok: false, error: msg };
  }
});
ipcMain.handle('hid:close', () => {
  try { hidDev?.close(); } catch { /* ignore */ }
  hidDev = null;
  return true;
});

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1060,
    minHeight: 700,
    backgroundColor: '#0d1117',
    title: 'MK61 Studio',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.webContents.on('console-message', (e, ...args) => {
    // Electron >=30 passes a details object; older passes (level, message, line, sourceId)
    let message = '', sourceId = '', lineNumber = 0;
    if (args[0] && typeof args[0] === 'object') {
      ({ message = '', sourceId = '', lineNumber = 0 } = args[0]);
    } else {
      [, message = '', lineNumber = 0, sourceId = ''] = args;
    }
    appLog(`[renderer] ${sourceId}:${lineNumber} ${message}`);
  });
  win.webContents.on('render-process-gone', (_e, details) => appLog(`[main] renderer gone: ${details.reason}`));
}

// ---------- config ----------
ipcMain.handle('config:get', () => {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8')); }
  catch { return null; }
});
ipcMain.handle('config:set', (_e, cfg) => {
  fs.mkdirSync(path.dirname(CONFIG_PATH()), { recursive: true });
  fs.writeFileSync(CONFIG_PATH(), JSON.stringify(cfg, null, 2));
  return true;
});
ipcMain.handle('config:path', () => CONFIG_PATH());

// ---------- autostart (Startup-folder shortcut — Windows only) ----------
// On Linux/macOS the equivalent would be a .desktop file in ~/.config/autostart;
// not implemented, so the option is hidden in the UI there.
const IS_WINDOWS = process.platform === 'win32';
ipcMain.handle('autostart:get', () => (IS_WINDOWS ? fs.existsSync(SHORTCUT_PATH()) : false));
ipcMain.handle('autostart:set', (_e, enable) => {
  if (!IS_WINDOWS) return false;
  const sp = SHORTCUT_PATH();
  try {
    if (enable) {
      // In dev mode (npm start) execPath is electron.exe -> point the shortcut at
      // electron with the app folder as working dir + argument.
      const target = process.execPath;
      const args = process.defaultApp ? `"${process.cwd()}"` : '';
      const wd = process.defaultApp ? process.cwd() : path.dirname(process.execPath);
      const q = (s) => String(s).replace(/'/g, "''");
      const script = [
        `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${q(sp)}')`,
        `$s.TargetPath='${q(target)}'`,
        `$s.Arguments='${q(args)}'`,
        `$s.WorkingDirectory='${q(wd)}'`,
        '$s.WindowStyle=7',
        '$s.Save()',
      ].join(';');
      execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { windowsHide: true });
    } else {
      fs.rmSync(sp, { force: true });
    }
    return true;
  } catch (err) {
    console.error('autostart error', err);
    return false;
  }
});

// ---------- misc ----------
ipcMain.handle('app:quit', () => { app.quit(); return true; });
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('app:log', (_e, msg) => { console.log('[renderer]', msg); return true; });

app.whenReady().then(() => {
  // Identifies the app on Windows (taskbar, toasts, Start Menu entries).
  app.setAppUserModelId('com.mk61studio.app');
  // Electron has no built-in WebHID chooser UI like Chrome; the permission
  // request handler IS the chooser. Granting returns the devices matching the
  // renderer's filter (our keyboard's vendor config collection).
  session.defaultSession.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    appLog(`[main] permission check: ${permission} from ${requestingOrigin}`);
    return permission === 'hid';
  });
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    appLog(`[main] permission request: ${permission}`);
    callback(permission === 'hid');
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { app.quit(); });
