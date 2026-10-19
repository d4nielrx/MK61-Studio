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
def write_block(b):
    send([0x02, 1, 0, 0, 0, 0, 0] + b[:256]); time.sleep(0.1)
def commit(b):
    b[126] = 1;  write_block(b); time.sleep(0.15)
    b[126] = 255; write_block(b); time.sleep(0.15)
def bounce():
    send([0x01, 2] + [0]*262); time.sleep(0.3)
    send([0x01, 1] + [0]*262); time.sleep(0.4)

orig = read_block()
print("Starting in 5 seconds. Two windows - tell me which one is SLOWER.", flush=True)
time.sleep(5)

def test(label, idxs, val=30, wait=12):
    b = read_block()
    for i in idxs:
        b[i] = val
    commit(b)
    bounce()
    print(f"WATCH NOW ({label}): bytes {idxs} = {val}. SLOWER than start?", flush=True)
    time.sleep(wait)

try:
    test("first half", list(range(10, 15)))       # 10,11,12,13,14
    test("second half", list(range(15, 20)) + [21, 22, 23])  # 15-19,21,22,23
    b = read_block()
    for i in list(range(10, 20)) + [21, 22, 23]:
        b[i] = orig[i]
    commit(b)
    bounce()
    print("RESTORED.", flush=True)
finally:
    d.close()
print("done", flush=True)
