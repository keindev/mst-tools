import { configure, reaction } from 'mobx';

import { types } from '../../index';
import {
    addMiddleware, decorate, destroy, flow, IMiddlewareEvent, IMiddlewareEventType, IMiddlewareHandler, recordActions,
    toGenerator, toGeneratorFunction,
} from '../../mst/index';

function delay<TV>(time: number, value: TV, shouldThrow = false): Promise<TV> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldThrow) reject(value);
      else resolve(value);
    }, time);
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function testCoffeeTodo(
  done: () => void,
  generator: (self: any) => (str: string) => Generator<Promise<any>, string | void | undefined, undefined>,
  shouldError: boolean,
  resultValue: string | undefined,
  producedCoffees: any[]
) {
  configure({ enforceActions: 'observed' });
  const Todo = types
    .model('', {
      title: 'get coffee',
    })
    .actions(self => ({
      startFetch: flow(generator(self)),
    }));
  const events: IMiddlewareEvent[] = [];
  const coffees: any[] = [];
  const t1 = Todo.create({});

  addMiddleware(t1, (c, next) => {
    events.push(c);

    return next(c);
  });
  reaction(
    () => t1.title,
    coffee => coffees.push(coffee)
  );

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function handleResult(res: string | undefined | void) {
    expect(res).toBe(resultValue);
    expect(coffees).toEqual(producedCoffees);

    const filtered = filterRelevantStuff(events);

    expect(filtered).toMatchSnapshot();
    configure({ enforceActions: 'never' });
    done();
  }

  // eslint-disable-next-line promise/catch-or-return, promise/prefer-await-to-then
  t1.startFetch('black').then(
    // eslint-disable-next-line promise/always-return
    r => {
      expect(shouldError).toBe(false);
      handleResult(r);
    },
    r => {
      expect(shouldError).toBe(true);
      handleResult(r);
    }
  );
}

// eslint-disable-next-line jest/no-done-callback
it('flow happens in single ticks', async () => {
  const X = types
    .model('', {
      y: 1,
    })
    .actions(self => ({
      p: flow(function* () {
        self.y++;
        self.y++;
        yield delay(1, true, false);
        self.y++;
        self.y++;
      }),
    }));
  const x = X.create();
  const values: number[] = [];

  reaction(
    () => x.y,
    v => values.push(v)
  );

  await x.p();

  expect(x.y).toBe(5);
  expect(values).toEqual([3, 5]);
});

// eslint-disable-next-line jest/expect-expect, jest/no-done-callback
it('can handle async actions', done => {
  testCoffeeTodo(
    done,
    self =>
      function* fetchData(kind: string) {
        self.title = 'getting coffee ' + kind;
        self.title = yield delay(100, 'drinking coffee');

        return 'awake';
      },
    false,
    'awake',
    ['getting coffee black', 'drinking coffee']
  );
});

// eslint-disable-next-line jest/expect-expect, jest/no-done-callback
it('can handle erroring actions', done => {
  testCoffeeTodo(
    done,
    () =>
      // eslint-disable-next-line require-yield
      function* fetchData(kind: string) {
        throw kind;
      },
    true,
    'black',
    []
  );
});

// eslint-disable-next-line jest/expect-expect, jest/no-done-callback
it('can handle try catch', done => {
  testCoffeeTodo(
    done,
    self =>
      function* fetchData(_kind: string) {
        try {
          yield delay(10, 'tea', true);

          return undefined;
        } catch (e) {
          self.title = e;

          return 'biscuit';
        }
      },
    false,
    'biscuit',
    ['tea']
  );
});

// eslint-disable-next-line jest/expect-expect, jest/no-done-callback
it('empty sequence works', done => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  testCoffeeTodo(done, () => function* fetchData(_kind: string) {}, false, undefined, []);
});

// eslint-disable-next-line jest/expect-expect, jest/no-done-callback
it('can handle throw from yielded promise works', done => {
  testCoffeeTodo(
    done,
    () =>
      function* fetchData(_kind: string) {
        yield delay(10, 'x', true);
      },
    true,
    'x',
    []
  );
});

it('typings', async () => {
  const M = types.model('', { title: types.string }).actions(self => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    function* a(_x: string) {
      yield delay(10, 'x', false);
      self.title = '7';

      return 23;
    }

    const b = flow(function* b(_x: string) {
      yield delay(10, 'x', false);
      self.title = '7';

      return 24;
    });

    return { a: flow(a), b };
  });
  const m1 = M.create({ title: 'test ' });
  const resA = m1.a('y');
  const resB = m1.b('y');
  const [x1, x2] = await Promise.all([resA, resB]);

  expect(x1).toBe(23);
  expect(x2).toBe(24);
});

it('recordActions should only emit invocation', async () => {
  let calls = 0;
  const M = types
    .model('', {
      title: types.string,
    })
    .actions(() => {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      function* a(_x: string) {
        yield delay(10, 'x', false);
        calls++;

        return 23;
      }

      return {
        a: flow(a),
      };
    });
  const m1 = M.create({ title: 'test ' });
  const recorder = recordActions(m1);

  await m1.a('x');

  recorder.stop();
  expect(recorder.actions).toEqual([
    {
      args: ['x'],
      name: 'a',
      path: '',
    },
  ]);
  expect(calls).toBe(1);
  recorder.replay(m1);

  await delay(50, '');

  expect(calls).toBe(2);
});

// eslint-disable-next-line jest/expect-expect, jest/no-done-callback
it('can handle nested async actions', done => {
  const uppercase = flow(function* uppercase(value: string) {
    const res = yield delay(20, value.toUpperCase());

    return res;
  });

  testCoffeeTodo(
    done,
    self =>
      function* fetchData(kind: string) {
        self.title = yield uppercase('drinking ' + kind);

        return self.title;
      },
    false,
    'DRINKING BLACK',
    ['DRINKING BLACK']
  );
});

it('can handle nested async actions when using decorate', async () => {
  const events: [IMiddlewareEventType, string][] = [];
  const middleware: IMiddlewareHandler = (call, next) => {
    events.push([call.type, call.name]);

    return next(call);
  };
  const uppercase = flow(function* uppercase(value: string) {
    const res = yield delay(20, value.toUpperCase());

    return res;
  });
  const Todo = types.model('', {}).actions(() => {
    const act = flow(function* act(value: string) {
      return yield uppercase(value);
    });

    return { act: decorate(middleware, act) };
  });

  const result = await Todo.create().act('x');

  expect(result).toBe('X');
  expect(events).toEqual([
    ['action', 'act'],
    ['flow_spawn', 'act'],
    ['flow_resume', 'act'],
    ['flow_resume', 'act'],
    ['flow_return', 'act'],
  ]);
});

it('flow gain back control when node become not alive during yield', async () => {
  // expect.assertions(2);
  const rejectError = new Error('Reject Error');
  const MyModel = types.model('', {}).actions(() => ({
    doAction() {
      return flow(function* () {
        // eslint-disable-next-line promise/no-return-wrap
        yield delay(20, '').then(() => Promise.reject(rejectError));
      })();
    },
  }));

  const m = MyModel.create({});
  const p = m.doAction();

  destroy(m);

  await expect(p).rejects.toThrow(rejectError);
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function filterRelevantStuff(stuff: IMiddlewareEvent[]) {
  return stuff.map((x: any) => {
    delete x.context;
    delete x.tree;

    return x;
  });
}

it('flow typings', async () => {
  const promise = Promise.resolve();

  const M = types.model('', { x: 5 }).actions(() => ({
    // should be () => Promise<void>
    voidToVoid: flow(function* () {
      yield promise;
    }), // should be (val: number) => Promise<number>
    numberToNumber: flow(function* (val: number) {
      yield promise;

      return val;
    }), // should be () => Promise<number>
    voidToNumber: flow(function* () {
      yield promise;

      return Promise.resolve(2);
    }),
  }));

  const m = M.create();

  // these should compile
  const a: void = await m.voidToVoid();

  expect(a).toBe(undefined);

  const b: number = await m.numberToNumber(4);

  expect(b).toBe(4);

  const c: number = await m.voidToNumber();

  expect(c).toBe(2);

  const d = await m.voidToNumber();

  expect(d).toBe(2);
});

/**
 * Detect explicit `any` type.
 * https://stackoverflow.com/a/55541672/4289902
 */
type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;

/**
 * Ensure that the type of the passed value is of the expected type, and is NOT the TypeScript `any` type
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-empty-function
function ensureNotAnyType<TExpected, TActual>(_value: IfAny<TActual, never, TExpected>) {}

it('yield* typings for toGeneratorFunction', async () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const voidPromise = () => Promise.resolve();
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const numberPromise = () => Promise.resolve(7);
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const stringWithArgsPromise = (_input1: string, _input2: boolean) => Promise.resolve('test-result');

  const voidGen = toGeneratorFunction(voidPromise);
  const numberGen = toGeneratorFunction(numberPromise);
  const stringWithArgsGen = toGeneratorFunction(stringWithArgsPromise);

  const M = types.model('', { x: 5 }).actions(() => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    function* testAction() {
      const voidResult = yield* voidGen();

      ensureNotAnyType<void, typeof voidResult>(voidResult);

      const numberResult = yield* numberGen();

      ensureNotAnyType<number, typeof numberResult>(numberResult);

      const stringResult = yield* stringWithArgsGen('input', true);

      ensureNotAnyType<string, typeof stringResult>(stringResult);

      return stringResult;
    }

    return {
      testAction: flow(testAction),
    };
  });

  const m = M.create();
  const result = await m.testAction();

  ensureNotAnyType<string, typeof result>(result);
  expect(result).toBe('test-result');
});

it('yield* typings for toGenerator', async () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const voidPromise = () => Promise.resolve();
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const numberPromise = () => Promise.resolve(7);
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const stringWithArgsPromise = (_input1: string, _input2: boolean) => Promise.resolve('test-result');

  const M = types.model('', { x: 5 }).actions(() => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    function* testAction() {
      const voidResult = yield* toGenerator(voidPromise());

      ensureNotAnyType<void, typeof voidResult>(voidResult);

      const numberResult = yield* toGenerator(numberPromise());

      ensureNotAnyType<number, typeof numberResult>(numberResult);

      const stringResult = yield* toGenerator(stringWithArgsPromise('input', true));

      ensureNotAnyType<string, typeof stringResult>(stringResult);

      return stringResult;
    }

    return {
      testAction: flow(testAction),
    };
  });

  const m = M.create();
  const result = await m.testAction();

  ensureNotAnyType<string, typeof result>(result);
  expect(result).toBe('test-result');
});
