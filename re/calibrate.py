import hid, time, sys

VID, PID = 0x1EA7, 0x9018

path = None
for info in hid.enumerate(VID, PID):
    if info['usage_page'] == 0xFF01 and info['usage'] == 0x0001:
        path = info['path']
d = hid.device(); d.open_path(path); d.set_nonblocking(1)

def send(buf):
    r = d.send_feature_report([0x07] + list(buf))
    time.sleep(0.12)
    return r

def recv():
    time.sleep(0.05)
    return list(d.get_feature_report(0x07, 264))

# --- READ profile 1 block (raw, includes report ID at [0]) ---
send([0x82, 1, 0, 0, 0, 0, 0] + [0]*257)
R1 = recv()
print("R1 head:", " ".join(f"{b:02x}" for b in R1[:24]))

# --- Build write per official M2 mapping: Data[8+i] = R1[7+i] ---
payload = [R1[7 + i] for i in range(256)]
ORIG_BRIGHTNESS_CANDIDATES = {}
# candidate write-positions for brightness: 4 (official Data[8+4])
orig4 = payload[4]
payload[4] = 0x50  # brightness = 80
print(f"writing brightness=80 (orig payload[4]=0x{orig4:02x})")

writebuf = [0x02, 1, 0, 0, 0, 0, 0] + payload  # Data[1]=cmd,Data[2]=profile,Data[3..7]=0
send(writebuf)
time.sleep(0.3)

# --- READ BACK ---
send([0x82, 1, 0, 0, 0, 0, 0] + [0]*257)
R2 = recv()

diffs = [(i, R1[i], R2[i]) for i in range(len(R1)) if R1[i] != R2[i]]
print("diffs (pos, old, new):")
for i, o, n in diffs:
    print(f"  resp[{i}] (payload[{i-7}]: 0x{o:02x} -> 0x{n:02x}")
if not diffs:
    print("  NO CHANGES — write mapping wrong or ignored")

# --- RESTORE original value at the changed position(s) ---
if diffs:
    payload2 = [R1[7 + i] for i in range(256)]
    # put original brightness back at whichever payload offset corresponds
    for i, o, n in diffs:
        po = i - 7  # payload index
        if 0 <= po < 256:
            payload2[po] = o
    send([0x02, 1, 0, 0, 0, 0, 0] + payload2)
    print("restored original values")

d.close()
