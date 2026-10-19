import hid, time

VID, PID = 0x1EA7, 0x9018
path = None
for info in hid.enumerate(VID, PID):
    if info['usage_page'] == 0xFF01 and info['usage'] == 0x0001:
        path = info['path']
d = hid.device(); d.open_path(path); d.set_nonblocking(1)

def send(buf):
    d.send_feature_report([0x07] + list(buf))
    time.sleep(0.15)

def recv():
    time.sleep(0.05)
    return list(d.get_feature_report(0x07, 264))

# Original profile-1 block, captured before any testing (block[j] = resp[8+j]):
ORIG = (
    [0x00, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00] +     # block[0..7]
    [0x00, 0x00, 0x00, 0x34, 0x00, 0x00, 0x00, 0x00] +     # block[8..15]
    [0x00] * 64 +                                            # block[16..79]
    [0x00] * 12 + [0xad, 0xa3, 0x99, 0x9e] +                # block[80..95]
    [0x00, 0xf4, 0xf6, 0xee, 0xb8, 0xb0, 0x99, 0xf9, 0xca, 0xe2, 0xcd, 0xa9, 0x8a, 0xa0, 0xff, 0x90] +
    [0x83, 0x68, 0xcc, 0x80, 0xda, 0x80, 0x7a, 0x8a, 0xff, 0xff, 0xff, 0xff, 0xff, 0xef, 0xeb, 0xee] +
    [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00] +
    [0x00] * (256 - 144)
)
assert len(ORIG) == 256, len(ORIG)

# Write full original settings block (identity mapping Data[8+i] = block[i])
send([0x02, 1, 0, 0, 0, 0, 0] + ORIG)
time.sleep(0.4)

# Verify
send([0x82, 1, 0, 0, 0, 0, 0] + [0] * 257)
R = recv()
bad = [(i, ORIG[i], R[8 + i]) for i in range(256) if R[8 + i] != ORIG[i]]
if not bad:
    print("RESTORED: profile 1 settings block is byte-identical to the pre-test state.")
else:
    print(f"{len(bad)} mismatches:")
    for i, e, a in bad[:20]:
        print(f"  block[{i}]: expected 0x{e:02x} got 0x{a:02x}")

d.close()
