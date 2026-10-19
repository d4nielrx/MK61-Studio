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

# Dump the CURRENT settings block for profile 1 — read cold, no write first.
blk = read_block()
print("=== profile 1 block (cold read) ===", flush=True)
print("effect(3):", blk[3], "brightness(4):", blk[4], "direction(5):", blk[5], flush=True)
print("byte11:", hex(blk[11]), "byte128(led status):", blk[128], flush=True)
print("flags24-32:", blk[24:33], flush=True)
print("palette R(84-97):", blk[84:98], flush=True)
print("palette G(98-111):", blk[98:112], flush=True)
print("palette B(112-125):", blk[112:126], flush=True)
print("region126-140:", blk[126:141], flush=True)
d.close()
