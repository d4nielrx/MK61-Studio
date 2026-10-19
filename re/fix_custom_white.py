import hid, time

VID, PID = 0x1EA7, 0x9018
path = None
for info in hid.enumerate(VID, PID):
    if info['usage_page'] == 0xFF01 and info['usage'] == 0x0001:
        path = info['path']
d = hid.device(); d.open_path(path); d.set_nonblocking(1)

def send(buf):
    d.send_feature_report([0x07] + list(buf)); time.sleep(0.2)
def recv():
    time.sleep(0.05)
    return list(d.get_feature_report(0x07, 264))
def read_block():
    for _ in range(3):
        send([0x82, 1] + [0]*262)
        r = recv()
        if r[0] == 7 and r[1] == 0x82:
            return r[8:264]
        time.sleep(0.2)
    raise RuntimeError('bad read')

KML = 70
PROFILE = 1
CUSTOMNUM = 0

# --- Overwrite custom-LED slot 0 with a COMPLETE, valid set (all keys, static white) ---
# 1) COLOR buffer (0x08): all white
colorBuf = [0xff] * (KML * 3)
pkt = [0]*264; pkt[1]=0x08; pkt[2]=PROFILE; pkt[3]=CUSTOMNUM
for i in range(256): pkt[8+i] = colorBuf[i] if i < len(colorBuf) else 0
send(pkt)
print("sent color buffer (0x08) - all white", flush=True)

# 2) FRAME buffer (0x09): ONE frame covering ALL 70 keys
frameBuf = [0]*264
frameBuf[0] = 1                    # 1 frame
frameBuf[182] = 0; frameBuf[183] = 0   # frame 0 time
for iIndex in range(KML):
    frameBuf[1 + iIndex//8] |= (1 << (iIndex % 8))
pkt = [0]*264; pkt[1]=0x09; pkt[2]=PROFILE; pkt[3]=CUSTOMNUM
for i in range(256): pkt[8+i] = frameBuf[i]
send(pkt)
print("sent frame buffer (0x09) - 1 frame, all 70 keys", flush=True)

# 3) EFFECT buffer (0x0A): static (2) for all keys
effBuf = [0]*(KML*3)
for i in range(KML): effBuf[i] = 2
pkt = [0]*264; pkt[1]=0x0a; pkt[2]=PROFILE; pkt[3]=CUSTOMNUM
for i in range(256): pkt[8+i] = effBuf[i] if i < len(effBuf) else 0
send(pkt)
print("sent effect buffer (0x0A) - static", flush=True)

# --- Now switch the block BACK to factory rainbow (effect 0) ---
blk = read_block()
blk[3] = 0          # effect = Wave (animated factory rainbow)
blk[4] = 10         # brightness
blk[5] = 0          # direction
blk[126] = 1        # custom count = 1 (slot 0 now valid)
blk[127] = 0        # current custom index
blk[128] = 1        # LED_Status = on
flags = [1,1,1,0,1,1,1,0,0]   # factory-rainbow signature
for i,f in enumerate(flags): blk[24+i] = f
send([0x02, 1, 0, 0, 0, 0, 0] + list(blk[:256]))
print("block set back to effect 0 (factory rainbow), LED on", flush=True)

# reload
send([0x01, 2] + [0]*262); time.sleep(0.3)
send([0x01, 1] + [0]*262); time.sleep(0.5)

chk = read_block()
print("after: effect=", chk[3], "bri=", chk[4], "byte128=", chk[128], flush=True)
print("done - watch keyboard. If still dark, we'll try factory reset next.", flush=True)
d.close()
