// ABI + device probe: run under Electron. Prints node-hid device enumeration.
try {
  const hid = require('node-hid');
  console.log('node-hid loaded in electron', process.versions.electron);
  const devs = hid.devices();
  const mk = devs.filter((d) => d.vendorId === 0x1ea7 && d.productId === 0x9018);
  console.log('gamakay devices:', JSON.stringify(mk, null, 1));
  const cfg = mk.find((d) => d.usagePage === 0xff01 && d.usage === 1);
  if (cfg) {
    const dev = new hid.HID(cfg.path);
    dev.sendFeatureReport([0x07, 0x81, ...Array(262).fill(0)]);
    const resp = dev.getFeatureReport(0x07, 264);
    console.log('resp.length =', resp.length);
    console.log('live read head:', Buffer.from(resp.slice(0, 8)).toString('hex'));
    dev.sendFeatureReport([0x07, 0x82, 1, ...Array(261).fill(0)]);
    const block = dev.getFeatureReport(0x07, 264);
    console.log('block resp length =', block.length);
    console.log('color slots block[84..107]:', Buffer.from(block.slice(8 + 84, 8 + 108)).toString('hex'));
    dev.close();
    console.log('FEATURE IO OK');
  } else {
    console.log('config interface not found');
  }
} catch (e) {
  console.log('FAILED:', e.message);
}
