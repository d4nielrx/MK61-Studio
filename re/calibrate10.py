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

print("GET READY! Watch the keyboard continuously. Starts in 15 seconds.", flush=True)
time.sleep(15)

# Write PURE RED in PLANAR order (R plane full, G/B planes zero)
blk = read_block()
for j in range(8):
    blk[84 + j] = 255     # red plane
    blk[92 + j] = 0       # green plane
    blk[100 + j] = 0      # blue plane
write_block(blk)
chk = read_block()
print("red written & verified in memory:", chk[84:108] == blk[84:108], flush=True)
print("=== STEP 1 (10s): red written. Does it turn SOLID RED by itself? ===", flush=True)
time.sleep(10)

switch_profile(2)
print("=== STEP 2: switched to profile 2 (3s) ===", flush=True)
time.sleep(3)
switch_profile(1)
print("=== STEP 3 (10s): switched BACK to profile 1. Is it SOLID RED now? ===", flush=True)
time.sleep(10)

print("*** RED IS LEFT IN THE KEYBOARD'S MEMORY ON PURPOSE. ***", flush=True)
print(">>> NEXT: UNPLUG the keyboard, wait 5 seconds, PLUG IT BACK IN,", flush=True)
print(">>> and watch what colors appear at power-on. Then tell me!", flush=True)
d.close()
