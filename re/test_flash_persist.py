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

def reload_lights():
    send([0x01, 2] + [0]*262); time.sleep(0.15)
    send([0x01, 1] + [0]*262); time.sleep(0.30)

saved = read_block()[:]  # keep original for restore

print("GET READY — 15s countdown, then watch colors for ~25s.", flush=True)
time.sleep(15)

# Distinctive planar-14 BLUE (R=0,G=0,B=255) so it's unmistakable vs green/red/rainbow
blk = read_block()
for j in range(14):
    blk[84 + j]      = 0    # R
    blk[84 + 14 + j] = 0    # G
    blk[84 + 28 + j] = 255  # B
for i in range(24, 33):
    blk[i] = 0
write_block(blk)
print("wrote planar-14 BLUE. keyboard should show BLUE now.", flush=True)
print(">>> STEP A (before bounce): is the keyboard BLUE?", flush=True)
time.sleep(25)

reload_lights()  # bounce away+back = forces re-read from flash
chk = read_block()
print("after profile-bounce: R(84-97):", chk[84:98], flush=True)
print("after profile-bounce: B(112-125):", chk[112:126], flush=True)
print(">>> STEP B (after bounce): still BLUE, or reverted to RED/rainbow?", flush=True)
print("   BLUE = persisted (in flash) | RED/rainbow = RAM-only (volatile)", flush=True)
time.sleep(25)

write_block(saved)
reload_lights()
print("restored original (should be back to red)", flush=True)
d.close()
