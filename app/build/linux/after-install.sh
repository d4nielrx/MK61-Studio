#!/bin/sh
# Runs after the .deb is installed.
# Grants the logged-in user access to the MK61's configuration HID interface
# without needing root.
set -e

RULE=/etc/udev/rules.d/99-mk61-studio.rules

cat > "$RULE" <<'EOF'
# Gamakay MK61 / SK61L configuration interface (vendor collection FF01:0001)
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1ea7", ATTRS{idProduct}=="9018", MODE="0660", TAG+="uaccess"
EOF

udevadm control --reload-rules 2>/dev/null || true
udevadm trigger 2>/dev/null || true

echo "MK61 Studio: installed udev rule ($RULE). Unplug and replug the keyboard."
exit 0
