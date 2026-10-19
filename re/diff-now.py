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

b = read_block()
print("effect/bri(byte4)/dir(byte5):", b[3], b[4], b[5])
print("byte11:", hex(b[11]))
print("flags 24..32:", b[24:33])
print("region 33..83:", b[33:84])
print("palette 84..107 planar R/G/B planes:")
print("  R:", b[84:92])
print("  G:", b[92:100])
print("  B:", b[100:108])
print("palette 84..107 interleaved:")
for j in range(8):
    print(f"  color{j+1}: ({b[84+3*j]}, {b[85+3*j]}, {b[86+3*j]})")
print("region 108..128:", b[108:129])
print("region 129..160:", b[129:161])
nz = [(i, v) for i, v in enumerate(b) if v != 0 and not (84 <= i <= 107)]
print("ALL other nonzero bytes:", nz[:80])
d.close()
