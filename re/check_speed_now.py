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
send([0x82, 1] + [0]*262)
r = recv()
b = list(r[8:264])
print(f"effect={b[3]} bri={b[4]} direction@5={b[5]} SPEED@11={b[11]} count={b[126]} ledstatus={b[128]}", flush=True)
d.close()
