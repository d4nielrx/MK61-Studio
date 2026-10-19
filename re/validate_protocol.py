import hid, time, sys

VID, PID = 0x1EA7, 0x9018

path = None
for info in hid.enumerate(VID, PID):
    if info['usage_page'] == 0xFF01 and info['usage'] == 0x0001:
        path = info['path']
if not path:
    print("MK61 vendor interface not found!")
    sys.exit(1)

d = hid.device()
d.open_path(path)
d.set_nonblocking(1)
print("opened:", path.decode())

def dump(tag, data):
    print(f"{tag} ({len(data)} bytes):")
    for i in range(0, min(len(data), 272), 16):
        chunk = data[i:i+16]
        print(f"  {i:04x}: " + " ".join(f"{b:02x}" for b in chunk))

# Command 0x81: read current profile
req = [0x07] + [0x00] * 263
req[1] = 0x81
r = d.send_feature_report(req)
print("send 0x81 ->", r)
time.sleep(0.1)
try:
    resp = d.get_feature_report(0x07, 264)
    dump("profile response", resp)
except Exception as e:
    print("get_feature_report failed:", e)

# Command 0x82: select profile 1 for readback
req = [0x07] + [0x00] * 263
req[1] = 0x82
req[2] = 1
r = d.send_feature_report(req)
print("send 0x82 (profile 1) ->", r)
time.sleep(0.1)
try:
    resp = d.get_feature_report(0x07, 264)
    dump("profile 1 settings block", resp)
except Exception as e:
    print("get_feature_report failed:", e)

d.close()
print("done")
