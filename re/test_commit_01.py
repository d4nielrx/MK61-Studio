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

saved = read_block()[:]

print("GET READY - 15s countdown, then watch colors.", flush=True)
time.sleep(15)

# 1) planar-14 BLUE write (RAM)
blk = read_block()
for j in range(14):
    blk[84 + j]      = 0
    blk[84 + 14 + j] = 0
    blk[84 + 28 + j] = 255
for i in range(24, 33):
    blk[i] = 0
write_block(blk)
print("STEP 1: wrote BLUE. keyboard should show BLUE now.", flush=True)
time.sleep(5)

# 2) COMMIT: send profile-select (0x01) = CloseDevice/SetProfile flow (official shutdown)
send([0x01, 1] + [0]*262)
print("STEP 2: sent 0x01 profile-select (commit hypothesis).", flush=True)
time.sleep(2)

# 3) FORCE a flash re-read via profile bounce (away + back). If blue survives this,
#    the 0x01 committed it to flash. (RAM-only would revert to old flash here.)
send([0x01, 2] + [0]*262); time.sleep(0.30)
send([0x01, 1] + [0]*262); time.sleep(0.40)

chk = read_block()
print("after bounce+commit: R(84-97):", chk[84:98], flush=True)
print("after bounce+commit: B(112-125):", chk[112:126], flush=True)
print("STEP 3: after the bounce, is it STILL BLUE (committed to flash) or REVERTED (still RAM-only)?", flush=True)
time.sleep(25)

write_block(saved)
send([0x01, 1] + [0]*262)
print("restored saved block (should be back to red). d.close()", flush=True)
d.close()
