// Test: does merely having a Chromium window (the app's environment) corrupt
// feature reads on this device? Same HID sequence as repro-app.js, plus a window.
const { app, BrowserWindow } = require('electron');
const hid = require('node-hid');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 400, height: 300, show: false });
  await win.loadURL('about:blank');
  await new Promise((r) => setTimeout(r, 1500));   // let Chromium settle

  const cfg = hid.devices().find(
    (d) => d.vendorId === 0x1ea7 && d.productId === 0x9018 && d.usagePage === 0xff01 && d.usage === 1
  );
  const dev = new hid.HID(cfg.path);
  if (typeof dev.on === 'function') dev.on('detach', () => console.log('DETACH EVENT'));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const full = (cmd) => { const a = Array(264).fill(0); a[0] = 0x07; a[1] = cmd; return a; };
  const show = (tag, r) => console.log(`${tag}: len=${r.length} head=${Buffer.from(r.slice(0, 4)).toString('hex')}`);

  dev.sendFeatureReport(full(0x81));
  await sleep(60);
  show('with window: 0x81 read #1', dev.getFeatureReport(0x07, 264));

  dev.sendFeatureReport(full(0x81));
  await sleep(120);
  show('with window: 0x81 read #2', dev.getFeatureReport(0x07, 264));

  dev.close();
  app.exit(0);
});
