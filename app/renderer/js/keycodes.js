// USB HID usage IDs + Gamakay firmware special codes for the MK61 (SK61L).
// Verified against the official driver tables (FunctionVariable.js, SupportData.js).

const HID_NAMES = {
  0x00: 'Disabled',
  0x28: 'Enter', 0x29: 'Esc', 0x2A: 'Backspace', 0x2B: 'Tab', 0x2C: 'Space',
  0x2D: '-', 0x2E: '=', 0x2F: '[', 0x30: ']', 0x31: '\\', 0x33: ';', 0x34: "'",
  0x35: '`', 0x36: ',', 0x37: '.', 0x38: '/', 0x39: 'Caps',
  0x46: 'PrtSc', 0x47: 'Scroll', 0x48: 'Pause',
  0x49: 'Ins', 0x4A: 'Home', 0x4B: 'PgUp', 0x4C: 'Del', 0x4D: 'End', 0x4E: 'PgDn',
  0x4F: '→', 0x50: '←', 0x51: '↓', 0x52: '↑',
  0x53: 'NumLk', 0x54: 'Num/', 0x55: 'Num*', 0x56: 'Num-', 0x57: 'Num+',
  0x58: 'NumEnter', 0x59: 'Num1', 0x5A: 'Num2', 0x5B: 'Num3', 0x5C: 'Num4',
  0x5D: 'Num5', 0x5E: 'Num6', 0x5F: 'Num7', 0x60: 'Num8', 0x61: 'Num9',
  0x62: 'Num0', 0x63: 'Num.', 0x64: 'k64', 0x65: 'Menu',
  // firmware specials
  0xAC: 'FN', 0xB2: 'Macro',
  0xA5: 'Stop', 0xA6: 'Prev', 0xA7: 'Play/Pause', 0xA8: 'Next',
  0xA9: 'Mute', 0xAA: 'Vol+', 0xAB: 'Vol-',
  0xD6: 'Bright+', 0xD7: 'Bright-', 0xD9: 'Effect+',
  0xDE: 'Speed-', 0xDF: 'Speed+', 0xF8: 'Custom FX', 0xF9: 'LED On/Off',
  0xFB: 'Endurance', 0xF3: 'FN Lock',
  // K71..K74 — hardware profile switch (official driver comment)
  0xAD: 'HW Profile 1', 0xAE: 'HW Profile 2', 0xAF: 'HW Profile 3', 0xB0: 'HW Profile 4',
  // mouse buttons (usable on this board's matrix)
  0xB7: 'Mouse L', 0xB8: 'Mouse R', 0xB9: 'Mouse M', 0xBA: 'Mouse Back', 0xBB: 'Mouse Fwd',
  0xBC: 'Scroll ↓', 0xBD: 'Scroll ↑',
};
for (let i = 0; i < 26; i++) HID_NAMES[0x04 + i] = String.fromCharCode(65 + i);
for (let i = 1; i <= 9; i++) HID_NAMES[0x1d + i] = String(i);
HID_NAMES[0x27] = '0';
for (let i = 0; i < 12; i++) HID_NAMES[0x3a + i] = 'F' + (i + 1);
const MODS = ['LCtrl', 'LShift', 'LAlt', 'LWin', 'RCtrl', 'RShift', 'RAlt', 'RWin'];
MODS.forEach((n, i) => { HID_NAMES[0xe0 + i] = n; });

function hidName(code) {
  return HID_NAMES[code] ?? ('0x' + Number(code).toString(16).toUpperCase().padStart(2, '0'));
}

// Assignable palette, grouped.
const KEY_GROUPS = [
  { name: 'Letters', items: Array.from({ length: 26 }, (_, i) => [0x04 + i, String.fromCharCode(65 + i)]) },
  { name: 'Numbers', items: Array.from({ length: 10 }, (_, i) => [i === 9 ? 0x27 : 0x1e + i, i === 9 ? '0' : String(i + 1)]) },
  {
    name: 'Control', items: [
      [0x28, 'Enter'], [0x29, 'Esc'], [0x2A, 'Backspace'], [0x2B, 'Tab'], [0x2C, 'Space'],
      [0x39, 'Caps Lock'], [0x64, 'Menu'], [0x00, 'Disabled'],
    ],
  },
  {
    name: 'Punctuation', items: [
      [0x2D, '-'], [0x2E, '='], [0x2F, '['], [0x30, ']'], [0x31, '\\'], [0x33, ';'],
      [0x34, "'"], [0x35, '`'], [0x36, ','], [0x37, '.'], [0x38, '/'],
    ],
  },
  { name: 'Function', items: Array.from({ length: 12 }, (_, i) => [0x3a + i, 'F' + (i + 1)]) },
  {
    name: 'Modifiers', items: [
      [0xE0, 'LCtrl'], [0xE1, 'LShift'], [0xE2, 'LAlt'], [0xE3, 'LWin'],
      [0xE4, 'RCtrl'], [0xE5, 'RShift'], [0xE6, 'RAlt'], [0xE7, 'RWin'], [0xAC, 'FN'],
    ],
  },
  {
    name: 'Navigation', items: [
      [0x46, 'PrtSc'], [0x47, 'Scroll'], [0x48, 'Pause'], [0x49, 'Ins'], [0x4A, 'Home'],
      [0x4B, 'PgUp'], [0x4C, 'Del'], [0x4D, 'End'], [0x4E, 'PgDn'],
      [0x4F, '→'], [0x50, '←'], [0x51, '↓'], [0x52, '↑'],
    ],
  },
  {
    name: 'Media', items: [
      [0xA7, 'Play/Pause'], [0xA6, 'Prev'], [0xA8, 'Next'], [0xA5, 'Stop'],
      [0xA9, 'Mute'], [0xAA, 'Vol+'], [0xAB, 'Vol-'],
    ],
  },
  {
    name: 'Device & lighting (FN layer)', items: [
      [0xD6, 'Bright+'], [0xD7, 'Bright-'], [0xD9, 'Effect+'], [0xDE, 'Speed-'],
      [0xDF, 'Speed+'], [0xF8, 'Custom FX'], [0xF9, 'LED On/Off'], [0xFB, 'Endurance'],
      [0xF3, 'FN Lock'], [0xAD, 'HW Profile 1'], [0xAE, 'HW Profile 2'],
      [0xAF, 'HW Profile 3'], [0xB0, 'HW Profile 4'],
    ],
  },
  {
    name: 'Mouse', items: [
      [0xB7, 'Mouse L'], [0xB8, 'Mouse R'], [0xB9, 'Mouse M'], [0xBA, 'Mouse Back'], [0xBB, 'Mouse Fwd'],
    ],
  },
];

// DOM keyCode / e.code -> HID usage (for "press a key to assign" + tester)
const VK_TO_HID = {
  8: 0x2A, 9: 0x2B, 13: 0x28, 16: 0xE1, 17: 0xE0, 18: 0xE2, 19: 0x48, 20: 0x39,
  27: 0x29, 32: 0x2C, 33: 0x4B, 34: 0x4E, 35: 0x4D, 36: 0x4A, 37: 0x50, 38: 0x52,
  39: 0x4F, 40: 0x51, 44: 0x46, 45: 0x49, 46: 0x4C, 144: 0x53, 145: 0x47,
  106: 0x54, 107: 0x57, 109: 0x56, 110: 0x63, 111: 0x55,
  93: 0x65,
  186: 0x33, 187: 0x2E, 188: 0x36, 189: 0x2D, 190: 0x37, 191: 0x38, 192: 0x35,
  219: 0x2F, 220: 0x31, 221: 0x30, 222: 0x34,
};
for (let i = 0; i < 10; i++) VK_TO_HID[48 + i] = i === 9 ? 0x27 : 0x1e + i;
for (let i = 0; i < 26; i++) VK_TO_HID[65 + i] = 0x04 + i;
for (let i = 0; i < 12; i++) VK_TO_HID[112 + i] = 0x3a + i;

const CODE_TO_HID = {
  ShiftLeft: 0xE1, ShiftRight: 0xE5, ControlLeft: 0xE0, ControlRight: 0xE4,
  AltLeft: 0xE2, AltRight: 0xE6, MetaLeft: 0xE3, MetaRight: 0xE7,
};

function eventToHid(e) {
  if (CODE_TO_HID[e.code]) return CODE_TO_HID[e.code];
  return VK_TO_HID[e.keyCode] ?? VK_TO_HID[e.which] ?? 0;
}

// e.code -> MK61 key name (for the tester overlay)
const CODE_TO_KEYNAME = {
  Escape: 'esc', Backspace: 'bksp', Tab: 'tab', Space: 'space', Enter: 'enter',
  CapsLock: 'caps', Minus: 'minus', Equal: 'plus', BracketLeft: 'lqu',
  BracketRight: 'rqu', Backslash: 'rqu', Semicolon: 'sem', Quote: 'quo',
  Comma: 'comma', Period: 'dot', Slash: 'qmark', Backquote: 'k29',
  ShiftLeft: 'lshift', ShiftRight: 'rshift', ControlLeft: 'lctrl',
  ControlRight: 'rctrl', AltLeft: 'lalt', AltRight: 'ralt',
  MetaLeft: 'win', MetaRight: 'win', ContextMenu: 'book',
  // Arrow* is completed at runtime from the default FN layer (see app.js buildTester):
  // the OS receives real arrow usages from whichever physical key the FN layer maps.
};
for (let i = 0; i < 26; i++) CODE_TO_KEYNAME['Key' + String.fromCharCode(65 + i)] = String.fromCharCode(97 + i);
for (let i = 1; i <= 9; i++) CODE_TO_KEYNAME['Digit' + i] = 'n' + i;
CODE_TO_KEYNAME.Digit0 = 'n0';
for (let i = 1; i <= 12; i++) CODE_TO_KEYNAME['F' + i] = 'f' + i;

// Lighting effects (from official arrEffect / arrColorIndex / arrColorNum tables)
const EFFECTS = [
  { id: 0, name: 'Wave', colors: 14, off: 84 },   // 14 color slots (live-verified vs official app; region 84-125)
  { id: 1, name: 'Breath', colors: 2, off: 33 },
  { id: 2, name: 'Cycle (rainbow)', colors: 0, off: null },
  { id: 3, name: 'Starlight', colors: 1, off: 39 },
  { id: 4, name: 'Encounter', colors: 2, off: 42 },
  { id: 5, name: 'Rain', colors: 1, off: 48 },
  { id: 6, name: 'Pulse', colors: 2, off: 51 },
  { id: 7, name: 'Cross', colors: 2, off: 57 },
  { id: 8, name: 'Trigger', colors: 2, off: 63 },
  { id: 9, name: 'Ripple', colors: 2, off: 69 },
  { id: 10, name: 'Blossom', colors: 2, off: 75 },
  { id: 11, name: 'Game Mode (WASD)', colors: 0, off: null },
  { id: 12, name: 'Lighting', colors: 1, off: 81 },
];
