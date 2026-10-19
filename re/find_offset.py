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

# Read raw response for 0x82 (read block) and dump the first ~40 bytes with indices
send([0x82, 1] + [0]*262)
r = recv()
print("raw len:", len(r), flush=True)
print("first 40 bytes (idx: value):", flush=True)
for i in range(0, 40):
    print(f"  [{i}] = {r[i]}", flush=True)

# We know effect/brightness/direction are stored at block[3],[4],[5].
# Find where a plausible block header sits by locating the known pattern.
# Earlier naive read block[0..7] gave effect at [3]. If block actually starts at
# raw index K, then effect is at raw[K+3].
print("---- scan for block start (effect/bri/dir sanity) ----", flush=True)
# effect byte is small (0..12), bri 0..20, dir 0..3. Try K = 6,7,8
for K in [6,7,8,9]:
    eff, bri, dr = r[K+3], r[K+4], r[K+5]
    print(f"  start@{K}: effect={eff} bri={bri} dir={dr}  (valid if eff<=12, bri<=20, dir<=3)", flush=True)
d.close()
