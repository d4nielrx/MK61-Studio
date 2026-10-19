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
    time.sleep(0.06)
    return list(d.get_feature_report(0x07, 264))

def read_block():
    send([0x82, 1] + [0]*262)
    r = recv()
    assert r[0] == 7 and r[1] == 0x82, f"bad header {r[:4]}"
    return list(r[8:264])

b = read_block()
print("effect:", b[3], " brightness:", b[4], " dir@5:", b[5], flush=True)
print("count@126:", b[126], " ledstatus@128:", b[128], flush=True)
print("", flush=True)
print("all non-zero bytes outside the palette region [84..125]:", flush=True)
for i in range(256):
    if b[i] != 0 and not (84 <= i <= 125):
        print(f"  block[{i}] = {b[i]}  (0x{b[i]:02x})", flush=True)
print("", flush=True)
print("palette region [84..125] first/last:", b[84:88], "...", b[120:126], flush=True)
d.close()
print("done", flush=True)
