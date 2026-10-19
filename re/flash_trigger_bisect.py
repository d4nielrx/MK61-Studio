import hid, time

VID, PID = 0x1EA7, 0x9018
path = None
for info in hid.enumerate(VID, PID):
    if info['usage_page'] == 0xFF01 and info['usage'] == 0x0001:
        path = info['path']
d = hid.device(); d.open_path(path); d.set_nonblocking(1)

def send(buf):
    r = d.send_feature_report([0x07] + list(buf)); time.sleep(0.15)
    if r < 0:
        print("  WARN: feature report failed", flush=True)

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

def bounce():   # switch away + back = force reload from FLASH
    send([0x01, 2] + [0]*262); time.sleep(0.4)
    send([0x01, 1] + [0]*262); time.sleep(0.6)

KML = 70
saved = read_block()[:]
print("saved block. effect=", saved[3], "count=", saved[126], "current=", saved[127], flush=True)

# ------------------------------------------------------------------
# 0) Write a COMPLETE, CORRECTLY-ALIGNED solid BLUE custom slot 0.
#    (My earlier test omitted alignment + frame data -> black screen.
#     This runs FIRST so every later stage has valid data behind it.)
# ------------------------------------------------------------------
blue = [0, 0, 255]

# color buffer 0x08: planar R/G/B over 70 LED positions
color = [0]*(KML*3)
for i in range(KML):
    color[i]           = blue[0]
    color[i + KML]     = blue[1]
    color[i + 2*KML]   = blue[2]
send([0x08, 1, 0, 0, 0, 0, 0] + color[:256])
print("custom color buffer (0x08) sent", flush=True)

# frame buffer 0x09: 1 frame, ALL keys included, frame time 0
frame = [0]*256
frame[0] = 1
for i in range(KML):
    frame[1 + i//8] |= (1 << (i % 8))
frame[182] = 0; frame[183] = 0
send([0x09, 1, 0, 0, 0, 0, 0] + frame)
print("custom frame buffer (0x09) sent - 1 frame, all 70 keys", flush=True)

# effect buffer 0x0A: static (2) for every key
eff = [0]*256
for i in range(KML):
    eff[i] = 2
send([0x0a, 1, 0, 0, 0, 0, 0] + eff)
print("custom effect buffer (0x0A) sent - static", flush=True)

def blue_block():
    b = saved[:]
    for j in range(14):          # planar-14 palette = SOLID BLUE
        b[84 + j]  = 0
        b[98 + j]  = 0
        b[112 + j] = 255
    return b

def stage(name, blk):
    write_block(blk)
    time.sleep(0.3)
    bounce()
    chk = read_block()
    ok = (chk[84:126] == blk[84:126] and chk[3] == blk[3]
          and chk[126] == blk[126] and chk[127] == blk[127])
    print(f"STAGE {name}: {'*** PERSISTED IN FLASH ***' if ok else 'reverted (RAM-only)'}"
          f"  effect={chk[3]} count={chk[126]} current={chk[127]}"
          f"  B-plane={chk[112]},{chk[113]}", flush=True)
    return ok, chk

print("", flush=True)
print("GET READY - 15s countdown. Watch the keyboard: it should show BLUE.", flush=True)
time.sleep(15)

# Stage A: only change the custom-count field (effect stays 0 = normal wave)
a = blue_block(); a[126] = 1; a[127] = 0
okA, _ = stage("A (count=1, effect=0)", a)

okA2 = False
if okA:
    # A worked -> try to re-commit a CLEAN copy (count back to 255 = factory)
    b = blue_block(); b[126] = 255; b[127] = 255
    okA2, _ = stage("A2 (clean count=255)", b)

if not okA:
    # Stage C: only change the current-custom-index field
    c = blue_block(); c[126] = 255; c[127] = 0
    okC, _ = stage("C (current=0, count=255)", c)
else:
    okC = False

if not (okA or okC):
    # Stage D: the original incident content (effect=15) - but now with
    # VALID blue custom data behind it, so it renders solid blue, not black.
    dd = blue_block(); dd[3] = 15; dd[126] = 1; dd[127] = 0
    okD, _ = stage("D (effect=15, count=1)", dd)
else:
    okD = False

print("", flush=True)
print("=" * 60, flush=True)
if okA or okA2 or okC or okD:
    print("RESULT: the keyboard accepted a FLASH COMMIT.", flush=True)
    print("Keyboard should be BLUE right now (animated wave with blue palette,", flush=True)
    if okD:
        print("  or SOLID blue = custom mode, effect 15).", flush=True)
    print("", flush=True)
    print("FINAL PROOF STEP:", flush=True)
    print("  1. UNPLUG the keyboard fully, wait 10 seconds, plug back in.", flush=True)
    print("  2. Tell me the color you see at power-on:", flush=True)
    print("     BLUE  = colors are permanently saved in flash! (the goal)", flush=True)
    print("     rainbow = it reverted.", flush=True)
else:
    print("RESULT: no stage persisted - all reverted to flash copy.", flush=True)
    print("Keyboard is back to the factory rainbow (original state).", flush=True)
    print("Tell me what you saw.", flush=True)
print("=" * 60, flush=True)
d.close()
