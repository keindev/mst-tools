import { configure } from 'mobx';

import { types } from '../../index';
import { getSnapshot, unprotect } from '../../mst/index';

it('should accept any serializable value', () => {
  configure({
    enforceActions: 'never',
  });
  const Factory = types.model('', {
    value: types.frozen<{ a: number; b: number } | undefined>(),
  });
  const doc = Factory.create();

  unprotect(doc);
  doc.value = { a: 1, b: 2 };
  expect(getSnapshot(doc)).toEqual({ value: { a: 1, b: 2 } });
});

it('should throw if value is not serializable', () => {
  const Factory = types.model('', {
    // eslint-disable-next-line @typescript-eslint/ban-types
    value: types.frozen<Function | undefined>(),
  });
  const doc = Factory.create();

  unprotect(doc);
  expect(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    doc.value = function IAmUnserializable() {};
  }).toThrowError(/Error while converting <function IAmUnserializable> to `frozen`/);
});

it('should accept any default value value', () => {
  const Factory = types.model('', {
    value: types.frozen(3),
  });
  const doc = Factory.create();

  expect(Factory.is({})).toBeTruthy();
  expect(getSnapshot(doc)).toEqual({ value: 3 });
});

it('should type strongly', () => {
  type Point = { x: number; y: number };
  const Mouse = types
    .model('', {
      loc: types.frozen<Point>(),
    })
    .actions(self => ({
      moveABit() {
        // self.loc.x += 1; // compile error, x is readonly!
        (self.loc as any).x += 1; // throws, frozen!
      },
    }));

  expect(Mouse.is({})).toBeTruthy(); // any value is acceptable to frozen, even undefined...

  const m = Mouse.create({
    // loc: 3 // type error!
    loc: { x: 2, y: 3 },
  });

  expect(() => {
    m.moveABit();
  }).toThrow("Cannot assign to read only property 'x'");
});

it('should be capable of using another MST type', () => {
  const Point = types.model('Point', { x: types.number, y: types.number });
  const Mouse = types.model('', {
    loc: types.frozen(Point),
  });

  expect(Mouse.is({})).toBeFalsy();
  expect(Mouse.is({ loc: {} })).toBeFalsy();
  expect(Mouse.is({ loc: { x: 3, y: 2 } })).toBeTruthy();

  expect(() => {
    (Mouse.create as any)();
  }).toThrow(
    'at path "/loc" value `undefined` is not assignable to type: `frozen(Point)` (Value is not a plain object)'
  );
  expect(() => {
    Mouse.create({ loc: { x: 4 } } as any);
  }).toThrow('at path "/loc/y" value `undefined` is not assignable to type: `number` (Value is not a number)');

  const m = Mouse.create({
    loc: { x: 3, y: 2 },
  });

  // eslint-disable-next-line prefer-destructuring
  const x = m.loc.x;

  expect(x).toBe(3);
});
