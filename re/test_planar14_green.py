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

print("GET READY — 15s countdown. Watch for SOLID GREEN (planar-14).", flush=True)
time.sleep(15)

saved = read_block()[:]

# PLANAR, 14 colors (ground truth from official app):
#   R plane 84..97, G plane 98..111, B plane 112..125
# Solid green => R=0, G=255, B=0 for all 14.
blk = read_block()
for j in range(14):
    blk[84 + j]      = 0     # R
    blk[84 + 14 + j] = 255   # G
    blk[84 + 28 + j] = 0     # B
for i in range(24, 33):      # zero spectrum flags (official does this too)
    blk[i] = 0
# preserve byte11, byte128 etc (read-modify-write, same as official)

write_block(blk)
chk = read_block()
print("planar-14 green written. R(84-97):", chk[84:98], flush=True)
print("G(98-111):", chk[98:112], flush=True)
print("B(112-125):", chk[112:126], flush=True)
print("flags:", chk[24:33], flush=True)

reload_lights()
print(">>> STEP A (25s): WHOLE KEYBOARD SOLID GREEN?", flush=True)
print("    GREEN = planar-14 CONFIRMED -> app fix ready", flush=True)
print("    otherwise = tell me what you see", flush=True)
time.sleep(25)

write_block(saved)
chk2 = read_block()
print("restored:", chk2[:256] == saved[:256], flush=True)
reload_lights()
print("done - back to red (your official-app setting)", flush=True)
d.close()
