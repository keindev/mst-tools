import { largeScenario, mediumScenario, smallScenario } from './scenarios';
import { start } from './timer';

// TODO: Not sure how this should work. This feels super fragile.
const TOO_SLOW_MS = 10000;

it('performs well on small scenario', () => {
  expect(smallScenario(10).elapsed < TOO_SLOW_MS).toBe(true);
});

it('performs well on medium scenario', () => {
  expect(mediumScenario(10).elapsed < TOO_SLOW_MS).toBe(true);
});

it('performs well on large scenario', () => {
  expect(largeScenario(10, 0, 0).elapsed < TOO_SLOW_MS).toBe(true);
  expect(largeScenario(10, 10, 0).elapsed < TOO_SLOW_MS).toBe(true);
  expect(largeScenario(10, 0, 10).elapsed < TOO_SLOW_MS).toBe(true);
  expect(largeScenario(10, 10, 10).elapsed < TOO_SLOW_MS).toBe(true);
});

// eslint-disable-next-line jest/no-done-callback
it('timer', done => {
  const go = start();

  // eslint-disable-next-line prefer-arrow-callback
  setTimeout(function () {
    const lap = go(true);

    // eslint-disable-next-line prefer-arrow-callback
    setTimeout(function () {
      const d = go();

      expect(lap).not.toBe(0);
      expect(d).not.toBe(0);
      expect(lap).not.toBe(d);
      done();
    }, 2);
  }, 2);
});
