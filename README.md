# MK61 Studio

[![Build](https://github.com/d4nielrx/MK61-Studio/actions/workflows/build.yml/badge.svg)](https://github.com/d4nielrx/MK61-Studio/actions/workflows/build.yml)

Open-source configuration software for the **Gamakay MK61 / SK61L** mechanical keyboard.

Customise your keyboard without the official Gamakay app:

| Feature | What it does |
|---|---|
| **Remap** | Reassign any key (normal or FN layer) to any other key. Multi-key combos and macros included. |
| **RGB lighting** | All 13 hardware effects, 14 custom colours, brightness, animation **direction** and **speed**. |
| **Macros** | Record key sequences, set delays and repeat counts, bind them to keys. |
| **Profiles** | 4 independent profiles (remaps + macros + lighting each), switchable on the keyboard. |
| **Key tester** | Light up keys as you press them to check every switch. |
| **Settings** | Windows-lock, arrow transposition, and more. |

Everything you apply is written to the keyboard's **flash memory**, so it survives
reboots and power loss with the software closed.

---

## Installing

### Windows
Download **`MK61-Studio-Setup-1.0.0.exe`** and run it. It installs to your user
profile, adds a desktop shortcut and a Start Menu entry.

There is also a **portable** build (`MK61-Studio-Portable-1.0.0.exe`) — no
installation, just run it.

> Windows SmartScreen may show a blue "Windows protected your PC" warning because
> the app is unsigned. Click **More info → Run anyway**.

### macOS
Download the `.dmg` from the [Releases page](https://github.com/d4nielrx/MK61-Studio/releases) and open it, then drag the app into **Applications**.

- **`MK61 Studio-1.0.0-arm64.dmg`** — Apple Silicon (M1/M2/M3/M4)
- **`MK61 Studio-1.0.0-x64.dmg`** — Intel

The app is unsigned, so macOS Gatekeeper blocks it on first launch. To allow it:

```bash
xattr -cr /Applications/MK61\ Studio.app
```

(or right-click the app → **Open** → confirm **Open**).

> **Building the Mac installers yourself?** macOS `.dmg` files can only be built
> on a Mac (Apple Silicon also needs macOS-only signing tooling). Copy
> **`MK61-Studio-source.zip`** to the Mac, unzip it, open Terminal in the `app`
> folder, and run:
>
> ```bash
> chmod +x build-mac.sh
> ./build-mac.sh
> ```
>
> That also builds the Linux `.AppImage` and `.deb`.

---

### Linux
Linux packages are built on a Mac (or in CI) — the AppImage format needs
`mksquashfs` and POSIX symlinks, which Electron's tooling only ships for Linux
and macOS hosts, never Windows. The `build-mac.sh` script above produces them
alongside the macOS installers, and the GitHub workflow can do it without a Mac.

Three flavours:

**`.deb`** (Ubuntu, Debian, Mint) — installs the app, a menu entry and the udev rule:

```bash
sudo apt install "./MK61 Studio-1.0.0-x64.deb"
```

**`.AppImage`** — no install at all, just make it executable and run it:

```bash
chmod +x "MK61 Studio-1.0.0-x86_64.AppImage"
./"MK61 Studio-1.0.0-x86_64.AppImage"
```

**`.tar.gz`** — a plain unpacked build, works on any distribution:

```bash
tar xzf "MK61 Studio-1.0.0-x64.tar.gz"
cd "MK61 Studio-1.0.0-x64" && ./mk61-studio
```

> **Permission note.** Linux blocks access to the keyboard's configuration
> interface for non-root users by default. The `.deb` installs the udev rule for
> you. With the AppImage or tar.gz, install it manually:
>
> ```bash
> sudo cp build/linux/99-mk61-studio.rules /etc/udev/rules.d/
> sudo udevadm control --reload-rules
> ```
>
> Then unplug and replug the keyboard.

---

## Using it

1. Start the app and press **Connect keyboard** (top right).
   *Close the official Gamakay app first* — only one program can talk to the
   keyboard at a time.
2. Pick a **profile** (Profile 1–4) at the top.
3. Tweak colours, remaps, macros…
4. Press **Apply lighting** to save colours only, or **Apply to keyboard** to save
   *everything* (remaps + macros + lighting + options) for that profile.
5. The keyboard shows the result immediately, and keeps it after you unplug it.

> **Direction** and **Speed** are separate controls. On this keyboard's firmware the
> speed byte is inverted (0 = fastest internally); the app presents it the natural
> way round, so *right = faster*.

---

## Building from source

```bash
cd app
npm install

npm start              # run the dev app
npm run dist:win       # Windows installer + portable exe  -> app/dist/
npm run dist:mac       # macOS dmg + zip                   -> app/dist/
npm run dist:linux     # Linux AppImage + .deb             -> app/dist/
```

Requires Node.js 20+. The `node-hid` native module ships prebuilt binaries for
Windows x64/arm64/ia32, macOS x64/arm64 and Linux, so no compiler is needed.

**Where each platform can be built:**

| Target | Windows host | macOS host | Linux host |
|---|---|---|---|
| Windows `.exe` | ✅ | ✅ | ✅ |
| macOS `.dmg` | ❌ | ✅ | ✅ |
| Linux `.AppImage` | ❌¹ | ✅ | ✅ |
| Linux `.deb` | ❌² | ✅ | ✅ |
| Linux `.tar.gz` | ✅ | ✅ | ✅ |

¹ needs `mksquashfs` + POSIX symlinks — Electron ships those for Linux/macOS hosts only.
² needs Ruby's `fpm` — Electron bundles it for Linux/macOS hosts only.

So on Windows you can build the Windows and `.tar.gz` artifacts; the rest want
`npm run dist:mac` on a Mac, `npm run dist:linux` on Linux, or a push of a `v*`
tag so the included GitHub Actions workflow (`.github/workflows/build.yml`)
builds every platform for you.

The app icon is generated by `build/make-icon.ps1` (Windows) and lives at
`build/icon.png`; Electron Builder converts it to `.ico` / `.icns` automatically.

---

## How it works

The keyboard speaks a proprietary HID protocol on vendor collection
`0xFF01:0x0001` of USB device `1EA7:9018`, using 264-byte feature reports
(report id `0x07`).

Notes on the protocol — the parts that took real digging to figure out — are in
[`STATUS.md`](STATUS.md), including:

* the settings-block layout (effect, brightness, **direction**, palette, **speed**),
* why the official driver's "speed" field is actually *direction* on this firmware,
* and the byte that must be toggled to make the firmware commit the block to flash.

---

## Licence

MIT
