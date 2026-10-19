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
    send([0x01, 1] + [0]*262); time.sleep(0.25)

print("GET READY — 15s countdown. Watch the keyboard.", flush=True)
time.sleep(15)

orig = read_block()
saved = orig[:]

# INTERLEAVED bright colors at 84-107: RED, GREEN, BLUE, YELLOW, MAGENTA, CYAN, WHITE, ORANGE
colors = [(255,0,0),(0,255,0),(0,0,255),(255,255,0),(255,0,255),(0,255,255),(255,255,255),(255,165,0)]
blk = read_block()
for j,(r,g,b) in enumerate(colors):
    blk[84 + 3*j + 0] = r
    blk[84 + 3*j + 1] = g
    blk[84 + 3*j + 2] = b
# Try byte128 = 1 (LED_Status on) per official driver comment
blk[128] = 1
write_block(blk)
chk = read_block()
print("wrote interleaved colors + byte128=1. verified 84-107:", chk[84:108] == blk[84:108], "byte128:", chk[128], flush=True)

reload_lights()
print(">>> STEP A (15s): Now do you see BRIGHT multi-color (red/green/blue/yellow...)?", flush=True)
print("    or still pastel?", flush=True)
time.sleep(15)

# Restore
write_block(saved)
chk2 = read_block()
print("restored:", chk2[:256] == saved[:256], flush=True)
reload_lights()
print("done - back to your colors", flush=True)
d.close()
