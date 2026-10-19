import re, sys

path = r"C:\Users\djdan\Documents\keybaord\re\official_sw\MK Series_SETUP_20220318.exe"
with open(path, "rb") as f:
    data = f.read()
print(f"size: {len(data)}")

pats = [
    b"Inno Setup", b"NSIS", b"Nullsoft", b"app.asar", b"electron", b"Electron",
    b"PyInstaller", b"MEIPASS", b".pak", b"CEF", b"cefsimple", b"Qt5Core",
    b"resources.dll", b"Microsoft.NET", b"mscoree", b".NETFramework",
    b"7z", b"Wise", b"InstallShield", b"$PLUGINSDIR", b"unistall", b"Uninstall",
    b"python3", b"PyQt", b"HidD_", b"hid.dll", b"setupapi", b"CreateFileW",
]
for p in pats:
    idx = data.find(p)
    print(f"{p.decode(errors='replace'):20s} -> {'FOUND @'+str(idx) if idx>=0 else '-'}")

# extract interesting ascii strings
strings = re.findall(rb"[\x20-\x7E]{8,}", data)
hits = [s.decode() for s in strings if re.search(rb"(?i)hid|keyboard|gamakay|mk61|vendor|usage|report|\.dll|\.exe|\.aslr|serial|firmware", s)]
print(f"\ntotal strings: {len(strings)}, interesting: {len(hits)}")
for h in hits[:120]:
    print(" ", h[:200])
