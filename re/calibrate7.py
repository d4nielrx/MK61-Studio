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
    send([0x82, 1] + [0]*262)
    r = recv()
    assert r[0] == 7 and r[1] == 0x82, r[:3]
    return r[8:264]

def write_block(b):
    send([0x02, 1, 0, 0, 0, 0, 0] + b[:256])

print("GET READY — starts in 8 seconds!", flush=True)
time.sleep(8)

orig = read_block()
saved = orig[84:108]

# INTERLEAVED pure red: 8 colors x (R,G,B) = 255,0,0 repeated
blk = read_block()
for j in range(8):
    blk[84 + 3*j + 0] = 255
    blk[84 + 3*j + 1] = 0
    blk[84 + 3*j + 2] = 0
write_block(blk)
print("--- interleaved PURE RED written (6s). WATCH: is the whole wave solid red? ---", flush=True)
time.sleep(6)

blk = read_block()
blk[84:108] = saved
write_block(blk)
chk = read_block()
print("restored & verified:", chk[84:108] == saved, flush=True)
d.close()
