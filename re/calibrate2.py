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
print(f"baseline: byte4={orig[4]} byte5={orig[5]} effect={orig[3]}", flush=True)

STEP = 8.0
CYCLES = 3
states = [
    ("STATE A: byte4=0 byte5=0", 4, 0, 5, 0),
    ("STATE B: byte4=6 byte5=0", 4, 6, 5, 0),
    ("STATE C: byte4=0 byte5=5", 4, 0, 5, 5),
]
for c in range(CYCLES):
    for label, i1, v1, i2, v2 in states:
        b = read_block()
        b[i1] = v1; b[i2] = v2
        write_block(b)
        print(f"cycle {c+1}/3  {label}", flush=True)
        time.sleep(STEP)

b = read_block()
b[4] = orig[4]; b[5] = orig[5]
write_block(b)
print(f"restored original byte4={orig[4]} byte5={orig[5]}", flush=True)
d.close()
