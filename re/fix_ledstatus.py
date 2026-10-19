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
print("before: effect=", blk[3], "byte128(led status)=", blk[128], flush=True)
blk[128] = 1   # LED_Status = 1 (on). 0=off,1=on,2=backlight-off,3=all-off
write_block(blk)
chk = read_block()
print("after: byte128=", chk[128], flush=True)
send([0x01, 2] + [0]*262); time.sleep(0.2)
send([0x01, 1] + [0]*262); time.sleep(0.4)
print("reloaded. watch keyboard: factory rainbow should be back.", flush=True)
d.close()
