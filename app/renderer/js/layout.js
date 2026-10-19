// MK61L layout data, extracted verbatim from the official Gamakay driver
// (backend/others/SKLayouts.js). Matrix_LEDCode is column-major: index = column*5 + row,
// 14 columns x 5 rows = 70 positions. Values in the key matrix are raw USB HID usage IDs.

const MATRIX_KEYS = [
  'esc', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n0', 'minus', 'plus', 'bksp',
  'tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'lqu', 'rqu', 'k29',
  'caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'sem', 'quo', 'enter',
  'lshift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'comma', 'dot', 'qmark', 'rshift',
  'lctrl', 'win', 'lalt', 'space', 'ralt', 'book', 'rctrl', 'fn',
];

const MATRIX_LEDCODE = [
  'esc', 'tab', 'caps', 'lshift', 'lctrl',
  'n1', 'q', 'a', '', 'win',
  'n2', 'w', 's', 'z', 'lalt',
  'n3', 'e', 'd', 'x', '',
  'n4', 'r', 'f', 'c', '',
  'n5', 't', 'g', 'v', 'space',
  'n6', 'y', 'h', 'b', '',
  'n7', 'u', 'j', 'n', '',
  'n8', 'i', 'k', 'm', '',
  'n9', 'o', 'l', 'comma', '',
  'n0', 'p', 'sem', 'dot', 'ralt',
  'minus', 'lqu', 'quo', 'qmark', 'book',
  'plus', 'rqu', '', '', 'rctrl',
  'bksp', 'k29', 'enter', 'rshift', 'fn',
];

const KEY_MATRIX_LENGTH = 70;

const KEY_DEFAULT_NORMAL = [
  0x29, 0x2b, 0x39, 0xe1, 0xe0, 0x1e, 0x14, 0x04,
  0x00, 0xe3, 0x1f, 0x1a, 0x16, 0x1d, 0xe2, 0x20, 0x08, 0x07, 0x1b, 0x00, 0x21, 0x15, 0x09, 0x06,
  0x00, 0x22, 0x17, 0x0a, 0x19, 0x2c, 0x23, 0x1c, 0x0b, 0x05, 0x00, 0x24, 0x18, 0x0d, 0x11, 0x00,
  0x25, 0x0c, 0x0e, 0x10, 0x00, 0x26, 0x12, 0x0f, 0x36, 0x00, 0x27, 0x13, 0x33, 0x37, 0xe6, 0x2d,
  0x2f, 0x34, 0x38, 0x65, 0x2e, 0x30, 0x00, 0x00, 0xe4, 0x2a, 0x31, 0x28, 0xe5, 0xac,
];

const KEY_DEFAULT_FN = [
  0x35, 0x00,
  0x39, 0xe1, 0xe0, 0x3a, 0xad, 0xa7, 0x00, 0xb1, 0x3b, 0xae, 0xa6, 0x1d, 0xe2, 0x3c, 0xaf, 0xa8,
  0x1b, 0x00, 0x3d, 0xb0, 0xa9, 0x06, 0x00, 0x3e, 0x17, 0xaa, 0x19, 0xf3, 0x3f, 0x1c, 0xab, 0x05,
  0x00, 0x40, 0x46, 0x49, 0xb5, 0x00, 0x41, 0x47, 0x4a, 0x4c, 0x00, 0x42, 0x48, 0x4b, 0x4d, 0x00,
  0x43, 0xd7, 0xde, 0x4e, 0x50, 0x44, 0xd6, 0xdf, 0x52, 0x51, 0x45, 0xf8, 0x00, 0x00, 0x4f, 0xf9,
  0xd9, 0xfc, 0xe5, 0xac,
];

// Visual positions (px) for the 61 keys, in MATRIX_KEYS order — from MK61L_Pos.
const KEY_POS = [
  // Esc..Bksp
  { x: 8, w: 27, y: 50 }, { x: 41, w: 27, y: 50 }, { x: 75, w: 27, y: 50 }, { x: 107, w: 27, y: 50 },
  { x: 141, w: 27, y: 50 }, { x: 173, w: 27, y: 50 }, { x: 207, w: 27, y: 50 }, { x: 239, w: 34, y: 50 },
  { x: 272, w: 27, y: 50 }, { x: 305, w: 27, y: 50 }, { x: 339, w: 27, y: 50 }, { x: 372, w: 27, y: 50 },
  { x: 405, w: 27, y: 50 }, { x: 437, w: 62, y: 50 },
  // Tab..k29
  { x: 8, w: 44, y: 83 }, { x: 58, w: 27, y: 83 }, { x: 91, w: 27, y: 83 }, { x: 125, w: 27, y: 83 },
  { x: 157, w: 27, y: 83 }, { x: 190, w: 27, y: 83 }, { x: 222, w: 27, y: 83 }, { x: 255, w: 27, y: 83 },
  { x: 289, w: 27, y: 83 }, { x: 321, w: 27, y: 83 }, { x: 355, w: 27, y: 83 }, { x: 388, w: 27, y: 83 },
  { x: 421, w: 27, y: 83 }, { x: 453, w: 45, y: 83 },
  // Caps..Enter
  { x: 8, w: 53, y: 116 }, { x: 66, w: 27, y: 116 }, { x: 100, w: 27, y: 116 }, { x: 133, w: 27, y: 116 },
  { x: 167, w: 27, y: 116 }, { x: 198, w: 27, y: 116 }, { x: 232, w: 27, y: 116 }, { x: 265, w: 27, y: 116 },
  { x: 298, w: 27, y: 116 }, { x: 331, w: 27, y: 116 }, { x: 364, w: 27, y: 116 }, { x: 397, w: 27, y: 116 },
  { x: 431, w: 66, y: 116 },
  // LShift..RShift
  { x: 8, w: 70, y: 149 }, { x: 83, w: 27, y: 149 }, { x: 116, w: 27, y: 149 }, { x: 149, w: 27, y: 149 },
  { x: 183, w: 27, y: 149 }, { x: 215, w: 27, y: 149 }, { x: 248, w: 27, y: 149 }, { x: 281, w: 27, y: 149 },
  { x: 314, w: 27, y: 149 }, { x: 347, w: 27, y: 149 }, { x: 380, w: 27, y: 149 }, { x: 413, w: 85, y: 149 },
  // LCtrl..FN
  { x: 8, w: 44, y: 182 }, { x: 56, w: 27, y: 182 }, { x: 90, w: 44, y: 182 }, { x: 140, w: 192, y: 182 },
  { x: 338, w: 44, y: 182 }, { x: 386, w: 27, y: 182 }, { x: 421, w: 27, y: 182 }, { x: 453, w: 45, y: 182 },
];

const KEY_LABELS = {
  esc: 'Esc', bksp: 'Bksp', tab: 'Tab', caps: 'Caps', enter: 'Enter', space: 'Space',
  lshift: 'Shift', rshift: 'Shift', lctrl: 'Ctrl', rctrl: 'Ctrl', lalt: 'Alt', ralt: 'Alt',
  win: 'Win', book: 'Menu', fn: 'FN', minus: '-', plus: '=', lqu: '[', rqu: ']',
  k29: '`', sem: ';', quo: "'", comma: ',', dot: '.', qmark: '/',
  n1: '1', n2: '2', n3: '3', n4: '4', n5: '5', n6: '6', n7: '7', n8: '8', n9: '9', n0: '0',
};
for (let i = 0; i < 26; i++) KEY_LABELS[String.fromCharCode(97 + i)] = String.fromCharCode(65 + i);

// name -> matrix position (index into the 70-byte layer arrays)
const LED_INDEX = {};
MATRIX_LEDCODE.forEach((name, i) => { if (name) LED_INDEX[name] = i; });

// physical default key name for each matrix position (for "reset to default" display)
function defaultLabel(layer, ledIdx) {
  const arr = layer === 'fn' ? KEY_DEFAULT_FN : KEY_DEFAULT_NORMAL;
  return hidName(arr[ledIdx] ?? 0);
}
