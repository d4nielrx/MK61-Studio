#!/bin/bash
# Build the macOS installer (and the Linux ones) on a Mac.
#   1. copy this whole project folder to the Mac
#   2. open Terminal in the "app" folder
#   3. run:  chmod +x build-mac.sh && ./build-mac.sh
#
# Produces (in app/dist/):
#   MK61 Studio-1.0.0-arm64.dmg   (macOS, Apple Silicon)
#   MK61 Studio-1.0.0-x64.dmg     (macOS, Intel)
#   MK61 Studio-1.0.0-x86_64.AppImage   (Linux, runs anywhere)
#   MK61 Studio-1.0.0-amd64.deb   (Linux, Debian/Ubuntu)
#
# Why a Mac? The AppImage format needs mksquashfs + POSIX symlinks, and
# electron-builder only ships those for Linux and macOS hosts - not Windows.
# (macOS also has a bundled fpm, so the .deb builds there too.)
set -e
cd "$(dirname "$0")"

echo "==> node $(node -v 2>/dev/null || echo 'NOT FOUND - install Node.js 20+ from https://nodejs.org')"
command -v node >/dev/null 2>&1 || { echo "Node.js is required (https://nodejs.org)"; exit 1; }

echo "==> installing dependencies"
npm install

echo "==> building macOS app (unsigned - macOS will ask you to allow it on first launch)"
npx electron-builder --mac

echo
echo "==> building Linux AppImage + .deb"
npx electron-builder --linux AppImage deb || echo "!! Linux build failed - the macOS installers above are still fine."

echo
echo "==> done. Your installers are in:"
ls -lh dist/*.dmg dist/*.zip dist/*.AppImage dist/*.deb 2>/dev/null || true
echo
echo "To let macOS run the app on first launch:"
echo "  xattr -cr \"/Applications/MK61 Studio.app\""
