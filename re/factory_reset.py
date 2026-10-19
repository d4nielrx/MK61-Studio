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

print("sending factory reset (0x01 0xFF)...", flush=True)
send([0x01, 0xFF] + [0]*262)
time.sleep(2.5)

print("switching to profile 2 then back to profile 1 to reload...", flush=True)
send([0x01, 2] + [0]*262)
time.sleep(2)
send([0x01, 1] + [0]*262)
time.sleep(2)

blk = read_block()
print("after reset: effect=", blk[3], "bri=", blk[4], "byte128(LED)=", blk[128], flush=True)
print("done - watch keyboard: factory rainbow should be solid now.", flush=True)
d.close()
