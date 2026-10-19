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

def switch_profile(p):   # 1..4
    send([0x01, p] + [0]*262)

print("GET READY! Watch the keyboard continuously. Red test starts in 12 seconds.", flush=True)
time.sleep(12)

orig = read_block()
saved = orig[84:116]

# Step 1: write red palette, hold 10s
blk = read_block()
for j in range(8):
    blk[84 + 3*j + 0] = 255
    blk[84 + 3*j + 1] = 0
    blk[84 + 3*j + 2] = 0
write_block(blk)
print("=== STEP 1 (10s): red written. Watch: does it turn red by itself? ===", flush=True)
time.sleep(10)

# Step 2: switch away and back - forces the keyboard to reload its colors
switch_profile(2)
print("=== STEP 2 (6s): now on profile 2. Colors may change. ===", flush=True)
time.sleep(6)
switch_profile(1)
print("=== STEP 3 (10s): switched BACK to profile 1. Is it red NOW? ===", flush=True)
time.sleep(10)

# Restore original colors, bounce profiles again so display shows them
blk = read_block()
blk[84:116] = saved
write_block(blk)
switch_profile(2)
time.sleep(2)
switch_profile(1)
time.sleep(2)
chk = read_block()
print("restored & verified:", chk[84:116] == saved, flush=True)
d.close()
