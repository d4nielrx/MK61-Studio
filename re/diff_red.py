import hid, time, json, os

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

cur = read_block()

# BASELINE (stock rainbow) captured before official app set red:
BASE = {
 0:1, 4:10, 11:32, 12:5, 13:5, 14:60, 15:100, 16:50, 17:50, 18:50, 19:50,
 20:30, 21:30, 22:30, 24:1, 25:1, 26:1, 28:1, 29:1, 30:1,
 33:255, 36:255, 39:255, 40:255, 41:255, 42:255, 43:255, 44:255, 49:255,
 51:255, 52:255, 53:255, 57:255, 58:255, 59:255, 63:255, 64:255, 65:255,
 69:255, 70:255, 71:255, 75:255, 76:255, 77:255, 81:255,
 84:255,85:255,86:255,87:255,88:255,89:189,90:126,91:63,
 92:0,93:0,94:0,95:0,96:0,97:0,98:0,99:63,
 100:126,101:189,102:255,103:255,104:255,105:255,106:255,107:255,
 108:255,109:255,110:255,111:189,121:63,122:126,123:189,124:255,125:255,126:255,127:255,128:1
}
# baseline flags 24..32 = [1,1,1,0,1,1,1,0,0]
BASE_FLAGS = {24:1,25:1,26:1,27:0,28:1,29:1,30:1,31:0,32:0}

print("=== CHANGED BYTES (baseline -> official red) ===", flush=True)
allidx = sorted(set(list(BASE.keys()) + list(BASE_FLAGS.keys()) + [i for i in range(256)]))
changes = []
for i in range(256):
    old = BASE.get(i, BASE_FLAGS.get(i, 0))
    new = cur[i]
    if old != new:
        changes.append((i, old, new))

for i, old, new in changes:
    print(f"  [{i}] {old} -> {new}", flush=True)

print("=== summary ===", flush=True)
print("changed indices:", [c[0] for c in changes], flush=True)
print("palette 84..125 now:", cur[84:126], flush=True)

# Look specifically for pure-red-ish (R high, G,B low) to locate red
print("=== scan for red-ish pixels (R>=150, G<=80, B<=80) ===", flush=True)
print("planar view R[84..125] G[84..125] B[84..125]:", flush=True)
print("  R:", cur[84:126], flush=True)
d.close()
