import re

p = r'C:\Users\djdan\Documents\keybaord\re\official_asar\backend\others\SupportData.js'
d = open(p, encoding='utf-8', errors='replace').read()
i = d.find('AllFunctionMapping')
seg = d[i:i + 20000]
seg = seg[:seg.find('];')]

rows = []
for m in re.finditer(r'\{([^{}]*)\}', seg):
    e = m.group(1)
    hid = re.search(r'hid: 0x([0-9A-Fa-f]+)', e)
    val = re.search(r"value: '([^']*)'", e)
    if hid:
        rows.append((int(hid.group(1), 16), val.group(1) if val else '?'))

rows.sort()
for h, v in rows:
    print(f"0x{h:02X}  {v}")
