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

def reload_lights():
    send([0x01, 2] + [0]*262); time.sleep(0.15)
    send([0x01, 1] + [0]*262); time.sleep(0.30)

print("GET READY — 15s countdown. Watch for SOLID GREEN (planar write).", flush=True)
time.sleep(15)

saved = read_block()[:]

# PLANAR solid green at wave palette 84..107 (n=8):
#   R plane 84..91 = 0, G plane 92..99 = 255, B plane 100..107 = 0
blk = read_block()
for j in range(8):
    blk[84 + j]     = 0     # R
    blk[84 + 8 + j] = 255   # G
    blk[84 + 16 + j]= 0     # B
# zero the spectrum flags (firmware rainbow gate)
for i in range(24, 33):
    blk[i] = 0
blk[128] = 1   # LED on
# keep brightness/speed unchanged (don't touch bytes 4,5)

write_block(blk)
chk = read_block()
print("planar green written. R:", chk[84:92], "G:", chk[92:100], "B:", chk[100:108], flush=True)
print("flags:", chk[24:33], flush=True)

reload_lights()
print(">>> STEP A (25s): WHOLE KEYBOARD SOLID GREEN? (planar + flags zeroed)", flush=True)
print("    GREEN = planar is correct + we control colors -> DONE", flush=True)
print("    weird multi-color = interleaved read;  rainbow/pastel = not the source", flush=True)
time.sleep(25)

write_block(saved)
chk2 = read_block()
print("restored:", chk2[:256] == saved[:256], flush=True)
reload_lights()
print("done - back to previous state", flush=True)
d.close()
