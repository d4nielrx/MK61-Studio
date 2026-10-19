import hid, time

VID, PID = 0x1EA7, 0x9018
path = None
for info in hid.enumerate(VID, PID):
    if info['usage_page'] == 0xFF01 and info['usage'] == 0x0001:
        path = info['path']
d = hid.device(); d.open_path(path); d.set_nonblocking(1)

d.send_feature_report([0x07, 0x82, 1] + [0]*261)
time.sleep(0.15)
resp = list(d.get_feature_report(0x07, 264))
print("py len =", len(resp))
print("py hex =", bytes(resp).hex())
d.close()
