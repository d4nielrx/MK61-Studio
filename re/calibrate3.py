import hid, time

VID, PID = 0x1EA7, 0x9018
path = None
for info in hid.enumerate(VID, PID):
    if info['usage_page'] == 0xFF01 and info['usage'] == 0x0001:
        path = info['path']
d = hid.device(); d.open_path(path); d.set_nonblocking(1)

def send(buf):
    d.send_feature_report([0x07] + list(buf))
    time.sleep(0.2)

def recv():
    time.sleep(0.05)
    return list(d.get_feature_report(0x07, 264))

def read_block():
    send([0x82, 1] + [0]*262)
    r = recv()
    assert r[0] == 7 and r[1] == 0x82, f"bad read head {r[:3]}"
    return r[8:264]

def write_block(block):
    send([0x02, 1, 0, 0, 0, 0, 0] + block[:256])

orig = read_block()
print(f"baseline: byte4={orig[4]} byte5={orig[5]}", flush=True)

STEP = 6.0

def set_bytes(b, **kv):
    nb = read_block()
    for k, v in kv.items():
        nb[int(k[1:])] = v
    write_block(nb)

print("TEST 1 (30s): byte5=0 fixed; byte4 = 0,3,6,12,24 — does it move FASTER?", flush=True)
for v in [0, 3, 6, 12, 24]:
    set_bytes(orig, b4=v, b5=0)
    print(f"  byte4={v}", flush=True)
    time.sleep(STEP)

print("TEST 2 (36s): byte4=0 fixed; byte5 = 0,1,2,3,4,5 — does it get DARKER?", flush=True)
for v in [0, 1, 2, 3, 4, 5]:
    set_bytes(orig, b4=0, b5=v)
    print(f"  byte5={v}", flush=True)
    time.sleep(STEP)

b = read_block()
b[4] = orig[4]; b[5] = orig[5]
write_block(b)
print(f"restored byte4={orig[4]} byte5={orig[5]}", flush=True)
d.close()
