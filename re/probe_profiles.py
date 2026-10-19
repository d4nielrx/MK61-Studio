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

def active_profile():
    send([0x81] + [0]*263)
    r = recv()
    if r[0] == 7 and r[1] == 0x81:
        return r[2]
    return None

def try_read(p):
    """Read settings block for profile p. Returns (valid, effect, count, head)."""
    send([0x82, p] + [0]*262)
    r = recv()
    valid = (r[0] == 7 and r[1] == 0x82)
    head = ','.join(f'{x:02x}' for x in r[:4])
    if valid:
        return True, r[8 + 3], r[8 + 126], head
    return False, None, None, head

def switch(p):
    send([0x01, p] + [0]*262)
    time.sleep(0.5)

print("active profile:", active_profile(), flush=True)
print("", flush=True)
print("reads while ACTIVE profile = 1:", flush=True)
for p in (1, 2, 3, 4):
    ok, eff, cnt, head = try_read(p)
    print(f"  read p{p}: valid={ok} head={head}"
          + (f" effect={eff} count={cnt}" if ok else "  <-- NO VALID RESPONSE"), flush=True)

print("", flush=True)
print("switching to profile 2 ... active now:", active_profile(), flush=True)
for p in (1, 2, 3, 4):
    ok, eff, cnt, head = try_read(p)
    print(f"  read p{p}: valid={ok} head={head}"
          + (f" effect={eff} count={cnt}" if ok else "  <-- NO VALID RESPONSE"), flush=True)

print("", flush=True)
switch(1)
print("switched back to profile 1. active:", active_profile(), flush=True)
ok, eff, cnt, head = try_read(1)
print(f"  read p1: valid={ok} head={head}" + (f" effect={eff} count={cnt}" if ok else ""), flush=True)
d.close()
print("done", flush=True)
