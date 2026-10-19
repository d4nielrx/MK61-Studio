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
    send([0x82, 1] + [0]*262)
    r = recv()
    assert r[0] == 7 and r[1] == 0x82
    return r[8:264]

def write_block(b):
    send([0x02, 1, 0, 0, 0, 0, 0] + b[:256])

print("GET READY — test starts in 10 seconds!", flush=True)
time.sleep(10)

orig = read_block()
print(f"start: effect={orig[3]} bri={orig[4]} speed={orig[5]}", flush=True)

for cycle in (1, 2):
    print(f"--- PHASE A (cycle {cycle}): effect flickers 0->1->0. WATCH: do my custom colors appear? ---", flush=True)
    b = read_block(); b[3] = 1; write_block(b); time.sleep(2)
    b = read_block(); b[3] = orig[3]; write_block(b); time.sleep(8)
    print("PHASE A done", flush=True)

print("--- PHASE B: brightness 50 then 100. WATCH: clean & brighter, or weird? ---", flush=True)
b = read_block(); b[4] = 50; write_block(b); time.sleep(5)
b = read_block(); b[4] = 100; write_block(b); time.sleep(5)

b = read_block(); b[4] = orig[4]; b[5] = orig[5]; b[3] = orig[3]; write_block(b)
print(f"restored effect={orig[3]} bri={orig[4]} speed={orig[5]}", flush=True)
d.close()
