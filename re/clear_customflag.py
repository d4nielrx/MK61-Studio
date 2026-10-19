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
def write_block(b):
    send([0x02, 1, 0, 0, 0, 0, 0] + list(b[:256]))

blk = read_block()
print("before: effect=", blk[3], "byte126(total custom)=", blk[126], "byte127(cur custom)=", blk[127], "byte128(LED status)=", blk[128], flush=True)
# Clear custom-mode leftovers so the LED engine stops trying to load custom data
blk[3]  = 0    # effect = Wave
blk[126] = 0   # total custom count -> 0 (NOT custom mode)
blk[127] = 0   # current custom index
blk[128] = 1   # LED status = on
# factory-rainbow flags (so firmware generates the rainbow itself)
flags = [1,1,1,0,1,1,1,0,0]
for i, f in enumerate(flags):
    blk[24+i] = f
blk[4] = 10    # brightness
write_block(blk)
chk = read_block()
print("after: effect=", chk[3], "byte126=", chk[126], "byte128=", chk[128], flush=True)
send([0x01, 2] + [0]*262); time.sleep(0.2)
send([0x01, 1] + [0]*262); time.sleep(0.4)
print("reloaded.", flush=True)
d.close()
