/**
 * Start a timer which return a function, which when called show the
 * number of milliseconds since it started.
 *
 * Passing true will give the current lap time.
 *
 * Example:
 * ```ts
 * const time = start()
 * // 1 second later
 * time() // 1.00
 * // 1 more second later
 * time() // 2.00
 * time(true) // 1.00
 * ```
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const start = () => {
  const started = process.hrtime();
  // eslint-disable-next-line prefer-const
  let last: [number, number] = [started[0], started[1]];

  return (lapTime = false) => {
    const final = process.hrtime(lapTime ? last : started);

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return Math.round((final[0] * 1e9 + final[1]) / 1e6);
  };
};
