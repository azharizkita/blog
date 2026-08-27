"use client";

/**
 * Error surface for paste/drop image uploads, decoupled from React state:
 * the repo's react-hooks lint rules (refs, immutability) forbid both
 * ref-reading closures escaping into non-hook calls and mutation of
 * hook-returned values (the TipTap editor, memoized boxes). Handlers are
 * registered from effects (the sanctioned place for the latest props) and
 * looked up at event time by a stable key — the editor instance, or any
 * stable token object.
 */
const handlers = new WeakMap<object, (message: string) => void>();

export function setUploadErrorHandler(
  key: object,
  handler: ((message: string) => void) | undefined,
): void {
  if (handler) handlers.set(key, handler);
  else handlers.delete(key);
}

export function reportUploadError(key: object, message: string): void {
  handlers.get(key)?.(message);
}
