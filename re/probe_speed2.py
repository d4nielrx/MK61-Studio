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
print(f"ORIGINAL: effect={orig[3]} bri={orig[4]} dir@5={orig[5]} b6={orig[6]} b7={orig[7]} b127={orig[127]}", flush=True)
print("Starting in 5 seconds... WATCH during each window.", flush=True)
time.sleep(5)

def test(label, idx, val, wait=12):
    b = read_block()
    b[idx] = val
    commit(b)
    bounce()
    print(f"WATCH NOW ({label}): block[{idx}] = {val}. Faster/slower/nothing?", flush=True)
    time.sleep(wait)

try:
    test("byte6", 6, 100)
    test("byte7", 7, 100)
    test("byte127", 127, 100)
    b = read_block()
    b[6] = orig[6]; b[7] = orig[7]; b[127] = orig[127]
    commit(b)
    bounce()
    print("RESTORED. Should look like the start.", flush=True)
finally:
    d.close()
print("done", flush=True)
