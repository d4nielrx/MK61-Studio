import hid, time

VID, PID = 0x1EA7, 0x9018
path = None
for info in hid.enumerate(VID, PID):
    if info['usage_page'] == 0xFF01 and info['usage'] == 0x0001:
        path = info['path']
d = hid.device(); d.open_path(path); d.set_nonblocking(1)

def send(buf):
    d.send_feature_report([0x07] + list(buf)); time.sleep(0.15)
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
def write_block(b):
    send([0x02, 1, 0, 0, 0, 0, 0] + list(b[:256]))

# MATRIX_LEDCODE (70 positions, column-major). index = column*5 + row
LEDCODE = [
 'esc','tab','caps','lshift','lctrl',
 'n1','q','a','','win',
 'n2','w','s','z','lalt',
 'n3','e','d','x','',
 'n4','r','f','c','',
 'n5','t','g','v','space',
 'n6','y','h','b','',
 'n7','u','j','n','',
 'n8','i','k','m','',
 'n9','o','l','comma','',
 'n0','p','sem','dot','ralt',
 'minus','lqu','quo','qmark','book',
 'plus','rqu','','','rctrl',
 'bksp','k29','enter','rshift','fn',
]
KML = 70   # KeyMatrixLength

# save current block so we can restore later
saved = read_block()

print("GET READY - 15s countdown, then watch for SOLID GREEN on ALL keys.", flush=True)
time.sleep(15)

# ---- color buffer (0x08): planar R/G/B over LED positions 0..69 ----
# driver: fills 432 to 0xFF (white) then writes planes at 0 / KML / 2*KML.
colorBuf = [0xff]*432          # default white like the driver
for pos in range(KML):         # every LED position -> solid green
    colorBuf[pos]        = 0    # R plane
    colorBuf[pos + KML]  = 255  # G plane
    colorBuf[pos + 2*KML]= 0    # B plane
# 0x08: send first 256 bytes
pkt = [0]*264
pkt[1] = 0x08; pkt[2] = 1; pkt[3] = 0   # profile, customNum
for i in range(256):
    pkt[8+i] = colorBuf[i] & 0xff
send(pkt)

# ---- effect buffer (0x0A): effect=2 (static) for every key, speed=0 ----
effBuf = [0]*432
for pos in range(KML):
    effBuf[pos]        = 2     # effect 2 = Static
    effBuf[pos + KML]  = 0     # speed
    effBuf[pos + 2*KML]= 0     # breath/extinguish
pkt = [0]*264
pkt[1] = 0x0a; pkt[2] = 1; pkt[3] = 0
for i in range(256):
    pkt[8+i] = effBuf[i] & 0xff
send(pkt)

# ---- activate Custom Mode (effect 15) in the settings block ----
blk = read_block()
blk[3] = 15          # effect = Custom Mode
blk[126] = 1         # total custom count
blk[127] = 0         # current custom index
for i in range(24, 33):
    blk[i] = 0
write_block(blk)

# reload so the LED engine picks up custom mode
send([0x01, 2] + [0]*262); time.sleep(0.2)
send([0x01, 1] + [0]*262); time.sleep(0.4)

chk = read_block()
print("block effect(3):", chk[3], "(15 = Custom Mode active)", flush=True)
print(">>> STEP A: is the whole keyboard now SOLID GREEN (static)?", flush=True)
print(">>> If yes: FULLY UNPLUG keyboard ~10s, replug, and report if green SURVIVES.", flush=True)
time.sleep(30)

# NOTE: we intentionally do NOT restore here, so the user can unplug and test
# persistence. Restoration happens in restore_custom.py afterwards.
print("left in custom-green mode for unplug test. run restore_custom.py after.", flush=True)
d.close()
