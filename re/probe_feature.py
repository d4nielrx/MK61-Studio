import hid, time, sys, ctypes
from ctypes import wintypes

VID, PID = 0x1EA7, 0x9018

# find the config interface path (usagePage 0xFF01, usage 0x0001)
path = None
for info in hid.enumerate(VID, PID):
    print(f"device: path={info['path']} up=0x{info['usage_page']:04x} u=0x{info['usage']:04x} {info['product_string']}")
    if info['usage_page'] == 0xFF01 and info['usage'] == 0x0001:
        path = info['path']
if not path:
    print("config interface not found"); sys.exit(1)

CMD = bytes([0x07, 0x81] + [0]*262)   # 264 bytes incl report id

def t(name, fn):
    try:
        ok = fn()
        print(f"{name}: {'OK' if ok is False else 'result=' + str(ok)}")
    except Exception as e:
        print(f"{name}: EXC {e}")

# --- Test A: hidapi (baseline, known good) ---
d = hid.device(); d.open_path(path)
r = d.send_feature_report(list(CMD)); time.sleep(0.1)
resp = d.get_feature_report(0x07, 264)
print("A: hidapi send ->", r, " recv head:", bytes(resp[:8]).hex())
d.close()

# --- ctypes CreateFile / HidD_* ---
k32 = ctypes.WinDLL('kernel32', use_last_error=True)
hid_dll = ctypes.WinDLL('hid.dll', use_last_error=True)
GENERIC_READ, GENERIC_WRITE = 0x80000000, 0x40000000
FILE_SHARE_READ, FILE_SHARE_WRITE = 1, 2
OPEN_EXISTING, INVALID = 3, wintypes.HANDLE(-1).value
FILE_FLAG_OVERLAPPED = 0x40000000

k32.CreateFileW.restype = wintypes.HANDLE
k32.CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
                            wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
hid_dll.HidD_GetFeature.restype = wintypes.BOOL
hid_dll.HidD_GetFeature.argtypes = [wintypes.HANDLE, wintypes.LPVOID, wintypes.ULONG]
hid_dll.HidD_SetFeature.restype = wintypes.BOOL
hid_dll.HidD_SetFeature.argtypes = [wintypes.HANDLE, wintypes.LPVOID, wintypes.ULONG]

winpath = path.decode() if isinstance(path, bytes) else str(path)
print("winpath:", winpath)

def probe(overlapped):
    flags = FILE_FLAG_OVERLAPPED if overlapped else 0
    h = k32.CreateFileW(winpath, GENERIC_READ | GENERIC_WRITE,
                        FILE_SHARE_READ | FILE_SHARE_WRITE, None, OPEN_EXISTING, flags, None)
    tag = "OVERLAPPED" if overlapped else "sync"
    if h in (INVALID, None):
        print(f"B-{tag}: CreateFile failed err={ctypes.get_last_error()}")
        return
    try:
        buf = ctypes.create_string_buffer(bytes(CMD))
        ok = hid_dll.HidD_SetFeature(h, buf, 264)
        err1 = ctypes.get_last_error()
        print(f"B-{tag}: SetFeature ok={bool(ok)} err={err1}")
        time.sleep(0.1)
        buf2 = ctypes.create_string_buffer(264)
        buf2.raw = b'\x07' + b'\x00'*263
        ok2 = hid_dll.HidD_GetFeature(h, buf2, 264)
        err2 = ctypes.get_last_error()
        print(f"B-{tag}: GetFeature ok={bool(ok2)} err={err2} head={buf2.raw[:8].hex()}")
    finally:
        k32.CloseHandle(h)

probe(False)
probe(True)
print("done")
