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

def write_block(b):
    send([0x02, 1, 0, 0, 0, 0, 0] + b[:256])

print("GET READY - first red phase starts in 10 seconds!", flush=True)
time.sleep(10)

orig = read_block()
saved = orig[84:116]

# PHASE A: interleaved red (R,G,B,R,G,B... = 255,0,0 repeated)
blk = read_block()
for j in range(8):
    blk[84 + 3*j + 0] = 255
    blk[84 + 3*j + 1] = 0
    blk[84 + 3*j + 2] = 0
write_block(blk)
print("--- PHASE A (8s): red written in order #1. Whole keyboard red? ---", flush=True)
time.sleep(8)

# PHASE B: planar red (all reds, then all greens=0, then all blues=0)
blk = read_block()
for j in range(8):
    blk[84 + j] = 255        # red plane
    blk[92 + j] = 0          # green plane
    blk[100 + j] = 0         # blue plane
write_block(blk)
print("--- PHASE B (8s): red written in order #2. Whole keyboard red, or mixed colors? ---", flush=True)
time.sleep(8)

blk = read_block()
blk[84:116] = saved
write_block(blk)
chk = read_block()
print("restored & verified:", chk[84:116] == saved, flush=True)
d.close()
