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
    # bounce to profile 2 then back to 1 (forces LED engine to re-read palette)
    send([0x01, 2] + [0]*262)
    time.sleep(0.15)
    send([0x01, 1] + [0]*262)
    time.sleep(0.25)

print("GET READY — starts in 15s. Watch the keyboard.", flush=True)
time.sleep(15)

# Save current state so we can restore it
orig = read_block()
saved = orig[:]

# PLANAR write of 8 distinct, obvious colors at wave offset 84, n=8:
#   R plane 84-91, G plane 92-99, B plane 100-107
blk = read_block()
# color order (j=0..7) we WANT to see as a wave:
#   RED, GREEN, BLUE, YELLOW, MAGENTA, CYAN, WHITE, ORANGE
R = [255, 0,   0,   255, 255, 0,   255, 255]
G = [0,   255, 0,   255, 0,   255, 255, 165]
B = [0,   0,   255, 0,   255, 255, 255, 0  ]
for j in range(8):
    blk[84 + j]     = R[j]
    blk[84 + 8 + j] = G[j]
    blk[84 + 16 + j] = B[j]
write_block(blk)
chk = read_block()
print("planar write verified:", chk[84:108] == blk[84:108], flush=True)
print("  R:", chk[84:92], flush=True)
print("  G:", chk[92:100], flush=True)
print("  B:", chk[100:108], flush=True)

print("=== reloading lights (profile bounce) ===", flush=True)
reload_lights()

print(">>> STEP A (15s): After reload, do you see a MULTI-COLOR wave", flush=True)
print("    (red, green, blue, yellow, magenta, cyan, white, orange)?", flush=True)
print("    or is it still the old pastel?", flush=True)
time.sleep(15)

# Restore original
write_block(saved)
chk2 = read_block()
print("restored:", chk2[:256] == saved[:256], flush=True)
reload_lights()
print("done - keyboard back to your colors", flush=True)
d.close()
