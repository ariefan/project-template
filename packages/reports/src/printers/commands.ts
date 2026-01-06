/**
 * ESC/POS Command Constants
 *
 * Standard ESC/POS commands for thermal printers
 * Reference: https://reference.epson-biz.com/modules/ref_escpos/index.php
 */

export const ESC_POS = {
  // === Initialization ===
  /** Initialize printer */
  INIT: "\x1B\x40",

  // === Text Formatting ===
  /** Bold on */
  BOLD_ON: "\x1B\x45\x01",
  /** Bold off */
  BOLD_OFF: "\x1B\x45\x00",
  /** Underline on (1-dot) */
  UNDERLINE_ON: "\x1B\x2D\x01",
  /** Underline on (2-dot) */
  UNDERLINE_ON_2: "\x1B\x2D\x02",
  /** Underline off */
  UNDERLINE_OFF: "\x1B\x2D\x00",
  /** Double height on */
  DOUBLE_HEIGHT: "\x1B\x21\x10",
  /** Double width on */
  DOUBLE_WIDTH: "\x1B\x21\x20",
  /** Double height and width */
  DOUBLE_SIZE: "\x1B\x21\x30",
  /** Normal size */
  NORMAL: "\x1B\x21\x00",
  /** Emphasized on */
  EMPHASIZED_ON: "\x1B\x45\x01",
  /** Emphasized off */
  EMPHASIZED_OFF: "\x1B\x45\x00",
  /** Inverted on (white text on black) */
  INVERTED_ON: "\x1D\x42\x01",
  /** Inverted off */
  INVERTED_OFF: "\x1D\x42\x00",

  // === Alignment ===
  /** Left align */
  ALIGN_LEFT: "\x1B\x61\x00",
  /** Center align */
  ALIGN_CENTER: "\x1B\x61\x01",
  /** Right align */
  ALIGN_RIGHT: "\x1B\x61\x02",

  // === Paper Control ===
  /** Line feed */
  FEED_LINE: "\x0A",
  /** Carriage return */
  CARRIAGE_RETURN: "\x0D",
  /** Paper cut (full cut) */
  CUT_FULL: "\x1D\x56\x00",
  /** Paper cut (partial cut) */
  CUT_PARTIAL: "\x1D\x56\x01",
  /** Feed and cut (feed n lines then cut) */
  FEED_AND_CUT: (lines: number) => `\x1D\x56\x42${String.fromCharCode(lines)}`,
  /** Feed paper (n dots) */
  FEED_DOTS: (dots: number) => `\x1B\x4A${String.fromCharCode(dots)}`,
  /** Feed paper (n lines) */
  FEED_LINES: (lines: number) => `\x1B\x64${String.fromCharCode(lines)}`,

  // === Line Spacing ===
  /** Set line spacing (n/180 inch) */
  LINE_SPACING: (n: number) => `\x1B\x33${String.fromCharCode(n)}`,
  /** Default line spacing */
  LINE_SPACING_DEFAULT: "\x1B\x32",

  // === Character Set ===
  /** Select character code table */
  CODE_PAGE: (n: number) => `\x1B\x74${String.fromCharCode(n)}`,

  // === Hardware ===
  /** Open cash drawer (pin 2) */
  CASH_DRAWER_2: "\x1B\x70\x00\x19\xFA",
  /** Open cash drawer (pin 5) */
  CASH_DRAWER_5: "\x1B\x70\x01\x19\xFA",
  /** Beep */
  BEEP: "\x1B\x42\x02\x02",

  // === Printer Width Constants ===
  /** Characters per line for 58mm printer (standard font) */
  CHARS_PER_LINE_58MM: 32,
  /** Characters per line for 80mm printer (standard font) */
  CHARS_PER_LINE_80MM: 48,
} as const;

/**
 * Character encoding tables
 */
export const CODE_PAGES = {
  /** CP437 (USA, European Standard) */
  CP437: 0,
  /** Katakana */
  KATAKANA: 1,
  /** CP850 (Multilingual) */
  CP850: 2,
  /** CP860 (Portuguese) */
  CP860: 3,
  /** CP863 (Canadian-French) */
  CP863: 4,
  /** CP865 (Nordic) */
  CP865: 5,
  /** CP1252 (Windows Latin 1) */
  CP1252: 16,
  /** CP866 (Cyrillic #2) */
  CP866: 17,
  /** PC852 (Latin 2) */
  CP852: 18,
  /** PC858 (Euro) */
  CP858: 19,
} as const;

/**
 * Box drawing characters for text-mode tables
 */
export const BOX_CHARS = {
  // Single line
  HORIZONTAL: "─",
  VERTICAL: "│",
  TOP_LEFT: "┌",
  TOP_RIGHT: "┐",
  BOTTOM_LEFT: "└",
  BOTTOM_RIGHT: "┘",
  T_DOWN: "┬",
  T_UP: "┴",
  T_RIGHT: "├",
  T_LEFT: "┤",
  CROSS: "┼",

  // Double line
  DOUBLE_HORIZONTAL: "═",
  DOUBLE_VERTICAL: "║",
  DOUBLE_TOP_LEFT: "╔",
  DOUBLE_TOP_RIGHT: "╗",
  DOUBLE_BOTTOM_LEFT: "╚",
  DOUBLE_BOTTOM_RIGHT: "╝",
  DOUBLE_T_DOWN: "╦",
  DOUBLE_T_UP: "╩",
  DOUBLE_T_RIGHT: "╠",
  DOUBLE_T_LEFT: "╣",
  DOUBLE_CROSS: "╬",

  // ASCII fallback
  ASCII_HORIZONTAL: "-",
  ASCII_VERTICAL: "|",
  ASCII_CORNER: "+",
  ASCII_CROSS: "+",
} as const;
