// Platform detection for keyboard-shortcut hints: macOS shows "⌘", everything
// else (Windows/Linux) shows "Ctrl" so hints match the keys users actually press.
export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent)

// Modifier key label, e.g. `${modKey}K` → "⌘K" on Mac, "Ctrl+K" elsewhere.
export const modKey = isMac ? '⌘' : 'Ctrl+'

// Modifier + Enter label for "submit" hints, e.g. "⌘+⏎" / "Ctrl+⏎".
export const modEnter = isMac ? '⌘+⏎' : 'Ctrl+⏎'
