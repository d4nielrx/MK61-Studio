import hid

VID, PID = 0x1EA7, 0x9018

def hexdump(b):
    return " ".join(f"{x:02X}" for x in b)

for info in hid.enumerate(VID, PID):
    print("=" * 70)
    print(f"path        : {info['path'].decode(errors='replace')}")
    print(f"interface   : {info.get('interface_number')}")
    print(f"usagePage   : 0x{info['usage_page']:04X}")
    print(f"usage       : 0x{info['usage']:04X}")
    print(f"manufacturer: {info.get('manufacturer_string')}")
    print(f"product     : {info.get('product_string')}")
    print(f"release     : 0x{info.get('release_number',0):04X}")
    print(f"serial      : {info.get('serial_number')}")
    try:
        d = hid.device()
        d.open_path(info['path'])
        desc = d.get_report_descriptor()
        print(f"descriptor  : {len(desc)} bytes")
        print(hexdump(desc))
        d.close()
    except Exception as e:
        print(f"descriptor  : ERROR {e}")
