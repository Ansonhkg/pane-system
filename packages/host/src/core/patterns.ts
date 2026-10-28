export const PATTERN = {
  GLOB_SEPARATOR: /,(?![^{}]*\})/,
  RELATIVE_PREFIX: /^\.\//,
  LEADING_SPACE: /^\s+/,
  LINE_ENDING: /[\r\n]+$/,
} as const;
