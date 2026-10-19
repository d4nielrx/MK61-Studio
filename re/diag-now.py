import hid, time

VID, PID = 0x1EA7, 0x9018
path = None
for info in hid.enumerate(VID, PID):
    if info['usage_page'] == 0xFF01 and info['usage'] == 0x0001:
        path = info['path']
d = hid.device(); d.open_path(path); d.set_nonblocking(1)

d.send_feature_report([0x07, 0x82, 1] + [0]*261)
time.sleep(0.15)
r = list(d.get_feature_report(0x07, 264))
assert r[0] == 7 and r[1] == 0x82, f"bad head {r[:3]}"
blk = r[8:264]
print("effect/brightness/speed:", blk[3], blk[4], blk[5])
print("wave colors R[84..91]:", blk[84:92])
print("wave colors G[92..99]:", blk[92:100])
print("wave colors B[100..107]:", blk[100:108])
print("color slots all zero?", all(b == 0 for b in blk[84:108]))
d.close()
