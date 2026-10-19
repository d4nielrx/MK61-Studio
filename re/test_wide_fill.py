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

print("GET READY — 15s countdown. Watch the keyboard.", flush=True)
time.sleep(15)

saved = read_block()[:]

# Fill a WIDE bright gradient across 84..125 (14 interleaved colors), zero flags.
# If the wave palette is longer than 8 slots, this makes the whole wave bright.
bright = [(255,0,0),(255,127,0),(255,255,0),(127,255,0),(0,255,0),(0,255,127),
          (0,255,255),(0,127,255),(0,0,255),(127,0,255),(255,0,255),(255,0,127),
          (255,80,80),(80,255,80)]
blk = read_block()
for j,(r,g,b) in enumerate(bright):
    off = 84 + 3*j
    if off+2 <= 125:
        blk[off+0] = r
        blk[off+1] = g
        blk[off+2] = b
for i in range(24, 33):
    blk[i] = 0          # zero spectrum flags
blk[128] = 1            # LED on
write_block(blk)
chk = read_block()
print("wide fill written. region 84..125:", chk[84:126], flush=True)
print("flags now:", chk[24:33], flush=True)

reload_lights()
print(">>> STEP A (25s): Is the WHOLE wave now bright/clean rainbow?", flush=True)
print("    ...or still a pastel+bright MIXTURE? ...or all pastel?", flush=True)
time.sleep(25)

write_block(saved)
chk2 = read_block()
print("restored:", chk2[:256] == saved[:256], flush=True)
reload_lights()
print("done - back to previous state", flush=True)
d.close()
