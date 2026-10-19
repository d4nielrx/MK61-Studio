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
print(f"block[0..10]: {orig[0:11]}", flush=True)
saved_pal = orig[84:108]

def set_palette(r, g, b_):
    blk = read_block()
    for j in range(8):
        blk[84 + j] = r
        blk[92 + j] = g
        blk[100 + j] = b_
    write_block(blk)

print("--- A: whole wave = PURE RED (5s). WATCH: does it turn red? ---", flush=True)
set_palette(255, 0, 0)
time.sleep(5)

print("--- B: whole wave = BLUE (5s). WATCH: does it turn blue? ---", flush=True)
set_palette(0, 64, 255)
time.sleep(5)

print("--- restoring your colors ---", flush=True)
blk = read_block()
blk[84:108] = saved_pal
write_block(blk)
time.sleep(1)

chk = read_block()
ok = chk[84:108] == saved_pal
print(f"restored & verified: {ok}", flush=True)
d.close()
