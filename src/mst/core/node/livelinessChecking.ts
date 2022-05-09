/**
 * Defines what MST should do when running into reads / writes to objects that have died.
 * - `"warn"`: Print a warning (default).
 * - `"error"`: Throw an exception.
 * - "`ignore`": Do nothing.
 */
export type LivelinessMode = 'warn' | 'error' | 'ignore';

let livelinessChecking: LivelinessMode = 'warn';

/**
 * Defines what MST should do when running into reads / writes to objects that have died.
 * By default it will print a warning.
 * Use the `"error"` option to easy debugging to see where the error was thrown and when the offending read / write took place
 */
export function setLivelinessChecking(mode: LivelinessMode): void {
  livelinessChecking = mode;
}

/** Returns the current liveliness checking mode. */
export function getLivelinessChecking(): LivelinessMode {
  return livelinessChecking;
}
