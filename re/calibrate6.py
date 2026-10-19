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
saved = orig[84:116]  # bytes 84..115 we are about to touch

# Discriminator: zeros everywhere, ONE full-white band at 92..99.
# If palette starts at 84: R=0,G=255,B=0     -> GREEN
# If palette starts at 92: R=255,G=0,B=0     -> RED
blk = read_block()
for i in range(84, 116):
    blk[i] = 0
for i in range(92, 100):
    blk[i] = 255
write_block(blk)
print("--- wrote zeros at 84..115 with white band at 92..99 (6s). WATCH: red or green? ---", flush=True)
time.sleep(6)

# restore
blk = read_block()
blk[84:116] = saved
write_block(blk)
chk = read_block()
print("restored & verified:", chk[84:116] == saved, flush=True)
d.close()
