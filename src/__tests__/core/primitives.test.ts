import { types } from '../../index';
import { applySnapshot, getSnapshot } from '../../mst/index';
import { isInteger } from '../../mst/utils';

it('Date instance can be reused', () => {
  const Model = types.model('', {
    a: types.model('', {
      b: types.string,
    }),
    c: types.Date, // types.string -> types.Date
  });
  const Store = types
    .model('', {
      one: Model,
      index: types.array(Model),
    })
    .actions(self => ({
      set(one: typeof Model.Type) {
        self.one = one;
      },
      push(model: typeof Model.Type) {
        self.index.push(model);
      },
    }));
  const object = { a: { b: 'string' }, c: new Date() }; // string -> date (number)
  const instance = Store.create({
    one: object,
    index: [object],
  });

  instance.set(object);
  expect(() => instance.push(object)).not.toThrow();
  expect(instance.one.c).toBe(object.c);
  expect(instance.index[0]!.c).toBe(object.c);
});

it('Date can be rehydrated using unix timestamp', () => {
  const time = new Date();
  const newTime = 6813823163;
  const Factory = types.model('', {
    date: types.optional(types.Date, () => time),
  });
  const store = Factory.create();

  expect(store.date.getTime()).toBe(time.getTime());
  applySnapshot(store, { date: newTime });
  expect(store.date.getTime()).toBe(newTime);
  expect(getSnapshot(store).date).toBe(newTime);
});

it('isInteger polyfill', () => {
  expect(isInteger(5)).toBe(true);
  expect(isInteger(-5)).toBe(true);
  expect(isInteger(5.2)).toBe(false);
});

test("Default inference for integers is 'number'", () => {
  const A = types.model('', {
    x: 3,
  });

  expect(
    A.is({
      x: 2.5,
    })
  ).toBe(true);
});

it('Passing non integer to types.integer', () => {
  const Size = types.model('', {
    width: types.integer,
    height: 20,
  });

  expect(() => {
    Size.create({ width: 10 });
  }).not.toThrow();

  expect(() => {
    Size.create({ width: 10.5 });
  }).toThrow();
});
