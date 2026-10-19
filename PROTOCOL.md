# Gamakay MK61 (SK61L) — Reverse-Engineered Protocol

Device: Gamakay MK61, USB `VID_1EA7 PID_9018`, product string `SK61L`, FW `0x7037`.
Source: official Gamakay "MK Series" driver (Electron app, `MK61Series.js`), verified live
against hardware with read/write experiments.

## Interfaces

| Interface | Usage Page | Usage | Purpose |
|---|---|---|---|
| MI_00 | 0x0001 | 0x0006 | Boot keyboard |
| MI_01 Col01 | 0xFF00 | 0xFF00 | Vendor input (report 0x04 = event push: key/profile/effect events) |
| MI_01 Col02 | 0x0001 | 0x0002 | Mouse |
| MI_01 Col03 | 0x000C | 0x0001 | Consumer (report 0x03) |
| MI_01 Col04 | 0xFF00 | 0x0001 | Vendor input (report 0x06, 3 bytes) |
| MI_01 Col05 | 0x0001 | 0x0006 | NKRO keyboard bitmap (report 0x0A) |
| **MI_02** | **0xFF01** | **0x0001** | **Vendor config — feature report 0x07, 264 bytes** |

## Transport

All configuration uses **feature report ID 0x07** on MI_02, total 264 bytes
(`[reportId, cmd, arg, ..., payload 256 bytes at offset 8]`).

Verified mapping (WebHID/hidapi view, report ID included at byte 0):

- `write Data[k]` ↔ `read resp[k]` (identity, k = 0..263)
- Profile readback block = `resp[8..263]` (256 bytes)
- Active profile = `resp[2]` after command 0x81

## Commands (`Data[1]`)

| Cmd | Name | Payload |
|---|---|---|
| 0x01 | Switch profile | `Data[2]` = profile 1..4; **`Data[2]=0xFF` = factory reset** |
| 0x02 | Write profile settings block | `Data[2]` = profile, `Data[8..263]` = 256-byte block |
| 0x03 | Write key matrix | `Data[2]` = profile, `Data[3]` = num(0), `Data[8 + m*70 + k]` = 3×70 bytes (normal layer, FN layer, custom-LED assignments) |
| 0x04 | Write per-key RGB | `Data[2]` = profile, `Data[8..217]` = 70×3 (R plane, G plane, B plane) |
| 0x05 | Write macro for key | `Data[2]` = profile, `Data[3]` = key index (0..69 normal, 70..139 FN), `Data[8..]` = macro data |
| 0x06 | Enable EP2 event push | `Data[2]` = 1 |
| 0x07 | AP-mode LED stream | `Data[2]` = page, `Data[8..263]` = 256 bytes |
| 0x08/0x09/0x0A | Custom LED frame colors/frames/effect | `Data[2]` = profile, `Data[3]` = custom slot, `Data[8..]` = 256 bytes |
| 0x0B | Sleep/direction/winlock | `Data[2]` = profile, `Data[8+3]` = direction, `Data[8+4]` = 0 (6K/NK), `Data[8+5]` = winlock |
| 0x81 | Read active profile | → `resp[2]` = profile ID (1..4) |
| 0x82 | Select profile for readback | `Data[2]` = profile → then GET 0x07 returns settings block |

## Profile settings block (256 bytes, offsets relative to `Data[8]`)

Verified by official driver code:

- `[0]` report rate index + 1 (also written at `Data[4]` in official code)
- `[3]` LED effect ID (0..12 = Wave, Breath, Cycle, Starlight, Encounter, Rain, Pulse,
  Cross, Trigger, Ripple, Blossom, Game Mode, Lighting; 15 = Custom)
- `[4]` brightness (0..100)
- `[5]` speed (0..100)
- `[126]` total custom LED count, `[127]` current custom, `[128]` LED status
- Colors (per effect): Wave `84` (8 colors), Breath `33` (2), Starlight `39` (1),
  Encounter `42` (2), Rain `48` (1), Pulse `51` (2), Cross `57` (2), Trigger `63` (2),
  Ripple `69` (2), Blossom `75` (2), Lighting `81` (1).
  Layout: R plane at `off..off+n-1`, G at `off+n..`, B at `off+2n..`.
  Cycle (2) and Game Mode (11) have no color slots (rainbow / WASD-only).

## Key matrix

70 positions (14 columns × 5 rows), order defined by `Matrix_LEDCode_MK61L`
(column-major: `index = column*5 + row`). Values are raw **USB HID usage IDs**
(0x04='A' … 0x28=Enter, 0xE0..0xE7 modifiers, 0xAC = FN key).

Special values:

- `0x00` — disabled (in FN layer: no action)
- `0xB2` — macro/combination marker; matrix byte at key = 0xB2 and macro data
  (written separately via cmd 0x05) holds `repeat(2 bytes BE) + [delayHi|0x80 if keydown, delayLo, hidCode]` triplets.
  Delay values < 20 ms are clamped to 20 ms.
- Hardware profile switch (FN layer): `0xAD/0xAE/0xAF/0xB0` = Profile 1..4 (K71..K74 in the official table)
- Lighting control: `0xD6` brightness+, `0xD7` brightness-, `0xD9` effect+,
  `0xDE` speed-, `0xDF` speed+, `0xF8` custom mode, `0xF9` LED on/off, `0xFB` endurance
- `0xA5..0xAB` media: stop, prev, play/pause, next, mute, vol+, vol−
- Mouse (macros/remaps): `0xB7` LMB, `0xB8` RMB, `0xB9` MMB, `0xBA` back, `0xBB` forward

Default keymaps (`KeyMatrixNormal_Default_MK61L`, `KeyMatrixFN_Default_MK61L`)
and full matrix tables are in `app/renderer/js/layout.js`, extracted verbatim
from the official driver.

## Timing

Official driver waits 50–200 ms after each feature write; reads wait ~10 ms.
We use 40–80 ms.

## Notes / gotchas

- The official app must not run simultaneously (device open conflicts).
- Settings live in the keyboard's own flash (persists across reboot); the app also
  keeps a local JSON copy and can re-apply at startup for safety.
- `GetFeatureReport` semantics differ between hidapi wrappers (report ID included or
  stripped); all offsets above assume **ID included at byte 0** (hidapi/WebHID style).
