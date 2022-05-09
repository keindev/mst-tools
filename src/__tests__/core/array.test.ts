import { autorun, configure, observable } from 'mobx';

import { types } from '../../index';
import {
    applyPatch, applySnapshot, cast, clone, detach, getPath, getSnapshot, IJsonPatch, isAlive, onPatch, onSnapshot,
    setLivelinessChecking, unprotect,
} from '../../mst/index';

configure({
  enforceActions: 'never',
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createTestFactories = () => {
  const ItemFactory = types.optional(
    types.model('', {
      to: 'world',
    }),
    {}
  );
  const Factory = types.array(ItemFactory);

  return { Factory, ItemFactory };
};

// === FACTORY TESTS ===
it('should create a factory', () => {
  const { Factory } = createTestFactories();

  expect(getSnapshot(Factory.create())).toEqual([]);
});

it('should succeed if not optional and no default provided', () => {
  const Factory = types.array(types.string);

  expect(getSnapshot(Factory.create())).toEqual([]);
});

it('should restore the state from the snapshot', () => {
  configure({
    useProxies: 'never',
  });

  const { Factory } = createTestFactories();
  const instance = Factory.create([{ to: 'universe' }]);

  expect(getSnapshot(instance)).toEqual([{ to: 'universe' }]);
  expect('' + instance).toBe('AnonymousModel@/0'); // just the normal to string
});

// === SNAPSHOT TESTS ===
it('should emit snapshots', () => {
  const { Factory, ItemFactory } = createTestFactories();
  const doc = Factory.create();

  unprotect(doc);

  const snapshots: typeof Factory.SnapshotType[] = [];

  onSnapshot(doc, snapshot => snapshots.push(snapshot));
  doc.push(ItemFactory.create());
  expect(snapshots).toEqual([[{ to: 'world' }]]);
});

it('should apply snapshots', () => {
  const { Factory } = createTestFactories();
  const doc = Factory.create();

  applySnapshot(doc, [{ to: 'universe' }]);
  expect(getSnapshot(doc)).toEqual([{ to: 'universe' }]);
});

it('should return a snapshot', () => {
  const { Factory, ItemFactory } = createTestFactories();
  const doc = Factory.create();

  unprotect(doc);
  doc.push(ItemFactory.create());
  expect(getSnapshot(doc)).toEqual([{ to: 'world' }]);
});

// === PATCHES TESTS ===
it('should emit add patches', () => {
  const { Factory, ItemFactory } = createTestFactories();
  const doc = Factory.create();

  unprotect(doc);

  const patches: IJsonPatch[] = [];

  onPatch(doc, patch => patches.push(patch));
  doc.push(ItemFactory.create({ to: 'universe' }));
  expect(patches).toEqual([{ op: 'add', path: '/0', value: { to: 'universe' } }]);
});

it('should apply an add patch', () => {
  const { Factory } = createTestFactories();
  const doc = Factory.create();

  applyPatch(doc, { op: 'add', path: '/0', value: { to: 'universe' } });
  expect(getSnapshot(doc)).toEqual([{ to: 'universe' }]);
});

it('should emit update patches', () => {
  const { Factory, ItemFactory } = createTestFactories();
  const doc = Factory.create();

  unprotect(doc);
  doc.push(ItemFactory.create());

  const patches: IJsonPatch[] = [];

  onPatch(doc, patch => patches.push(patch));
  doc[0] = ItemFactory.create({ to: 'universe' });
  expect(patches).toEqual([{ op: 'replace', path: '/0', value: { to: 'universe' } }]);
});

it('should apply an update patch', () => {
  const { Factory } = createTestFactories();
  const doc = Factory.create();

  applyPatch(doc, { op: 'replace', path: '/0', value: { to: 'universe' } });
  expect(getSnapshot(doc)).toEqual([{ to: 'universe' }]);
});

it('should emit remove patches', () => {
  const { Factory, ItemFactory } = createTestFactories();
  const doc = Factory.create();

  unprotect(doc);
  doc.push(ItemFactory.create());

  const patches: IJsonPatch[] = [];

  onPatch(doc, patch => patches.push(patch));
  doc.splice(0);
  expect(patches).toEqual([{ op: 'remove', path: '/0' }]);
});

it('should apply a remove patch', () => {
  const { Factory, ItemFactory } = createTestFactories();
  const doc = Factory.create();

  unprotect(doc);
  doc.push(ItemFactory.create());
  doc.push(ItemFactory.create({ to: 'universe' }));
  applyPatch(doc, { op: 'remove', path: '/0' });
  expect(getSnapshot(doc)).toEqual([{ to: 'universe' }]);
});

it('should apply patches', () => {
  const { Factory } = createTestFactories();
  const doc = Factory.create();

  applyPatch(doc, [
    { op: 'add', path: '/0', value: { to: 'mars' } },
    { op: 'replace', path: '/0', value: { to: 'universe' } },
  ]);
  expect(getSnapshot(doc)).toEqual([{ to: 'universe' }]);
});

// === TYPE CHECKS ===
it('should check the type correctly', () => {
  const { Factory } = createTestFactories();
  const doc = Factory.create();

  expect(Factory.is(doc)).toEqual(true);
  expect(Factory.is([])).toEqual(true);
  expect(Factory.is({})).toEqual(false);
  expect(Factory.is([{ to: 'mars' }])).toEqual(true);
  expect(Factory.is([{ wrongKey: true }])).toEqual(true);
  expect(Factory.is([{ to: true }])).toEqual(false);
});

it('paths should remain correct when splicing', () => {
  const Task = types.model('Task', {
    done: false,
  });
  const store = types
    .model('', {
      todoList: types.array(Task),
    })
    .create({
      todoList: [{}],
    });

  unprotect(store);
  expect(store.todoList.map(getPath)).toEqual(['/todoList/0']);
  store.todoList.push({});
  expect(store.todoList.map(getPath)).toEqual(['/todoList/0', '/todoList/1']);
  store.todoList.unshift({});
  expect(store.todoList.map(getPath)).toEqual(['/todoList/0', '/todoList/1', '/todoList/2']);
  store.todoList.splice(0, 2);
  expect(store.todoList.map(getPath)).toEqual(['/todoList/0']);
  store.todoList.splice(0, 1, {}, {}, {});
  expect(store.todoList.map(getPath)).toEqual(['/todoList/0', '/todoList/1', '/todoList/2']);
  store.todoList.remove(store.todoList[1]!);
  expect(store.todoList.map(getPath)).toEqual(['/todoList/0', '/todoList/1']);
});

it('items should be reconciled correctly when splicing - 1', () => {
  configure({
    useProxies: 'never',
  });

  const Task = types.model('Task', {
    x: types.string,
  });
  const a = Task.create({ x: 'a' }),
    b = Task.create({ x: 'b' }),
    c = Task.create({ x: 'c' }),
    d = Task.create({ x: 'd' });
  const store = types
    .model('', {
      todoList: types.array(Task),
    })
    .create({
      todoList: [a],
    });

  unprotect(store);
  expect(store.todoList.slice()).toEqual([a]);
  expect(isAlive(a)).toBe(true);
  store.todoList.push(b);
  expect(store.todoList.slice()).toEqual([a, b]);
  store.todoList.unshift(c);
  expect(store.todoList.slice()).toEqual([c, a, b]);
  store.todoList.splice(0, 2);
  expect(store.todoList.slice()).toEqual([b]);
  expect(isAlive(a)).toBe(false);
  expect(isAlive(b)).toBe(true);
  expect(isAlive(c)).toBe(false);

  setLivelinessChecking('error');
  expect(() => store.todoList.splice(0, 1, a, c, d)).toThrowError(
    // eslint-disable-next-line max-len
    "You are trying to read or write to an object that is no longer part of a state tree. (Object type: 'Task', Path upon death: '/todoList/1', Subpath: '', Action: ''). Either detach nodes first, or don't use objects after removing / replacing them in the tree."
  );
  store.todoList.splice(0, 1, clone(a), clone(c), clone(d));
  expect(store.todoList.map(_ => _.x)).toEqual(['a', 'c', 'd']);
});

it('items should be reconciled correctly when splicing - 2', () => {
  const Task = types.model('Task', {
    x: types.string,
  });
  const a = Task.create({ x: 'a' }),
    b = Task.create({ x: 'b' }),
    c = Task.create({ x: 'c' }),
    d = Task.create({ x: 'd' });
  const store = types
    .model('', {
      todoList: types.array(Task),
    })
    .create({
      todoList: [a, b, c, d],
    });

  unprotect(store);
  store.todoList.splice(2, 1, { x: 'e' }, { x: 'f' });
  // becomes, a, b, e, f, d
  expect(store.todoList.length).toBe(5);
  expect(store.todoList[0] === a).toBe(true);
  expect(store.todoList[1] === b).toBe(true);
  expect(store.todoList[2] !== c).toBe(true);
  expect(store.todoList[2]!.x).toBe('e');
  expect(store.todoList[3] !== d).toBe(true);
  expect(store.todoList[3]!.x).toBe('f');
  expect(store.todoList[4] === d).toBe(true); // preserved and moved
  expect(store.todoList[4]!.x).toBe('d');
  expect(store.todoList.map(getPath)).toEqual([
    '/todoList/0',
    '/todoList/1',
    '/todoList/2',
    '/todoList/3',
    '/todoList/4',
  ]);
  store.todoList.splice(1, 3, { x: 'g' });
  // becomes a, g, d
  expect(store.todoList.length).toBe(3);
  expect(store.todoList[0] === a).toBe(true);
  expect(store.todoList[1]!.x).toBe('g');
  expect(store.todoList[2]!.x).toBe('d');
  expect(store.todoList[1] !== b).toBe(true);
  expect(store.todoList[2] === d).toBe(true); // still original d
  expect(store.todoList.map(getPath)).toEqual(['/todoList/0', '/todoList/1', '/todoList/2']);
});

it('should reconciliate keyed instances correctly', () => {
  const Store = types.model('', {
    todoList: types.optional(
      types.array(
        types.model('Task', {
          id: types.identifier,
          task: '',
          done: false,
        })
      ),
      []
    ),
  });
  const store = Store.create({
    todoList: [
      { id: '1', task: 'coffee', done: false },
      { id: '2', task: 'tea', done: false },
      { id: '3', task: 'biscuit', done: false },
    ],
  });

  expect(store.todoList.map(todo => todo.task)).toEqual(['coffee', 'tea', 'biscuit']);
  expect(store.todoList.map(todo => todo.done)).toEqual([false, false, false]);
  expect(store.todoList.map(todo => todo.id)).toEqual(['1', '2', '3']);

  const coffee = store.todoList[0]!;
  const tea = store.todoList[1]!;
  const biscuit = store.todoList[2]!;

  applySnapshot(store, {
    todoList: [
      { id: '2', task: 'Tee', done: true },
      { id: '1', task: 'coffee', done: true },
      { id: '4', task: 'biscuit', done: false },
      { id: '5', task: 'stuff', done: false },
    ],
  });
  expect(store.todoList.map(todo => todo.task)).toEqual(['Tee', 'coffee', 'biscuit', 'stuff']);
  expect(store.todoList.map(todo => todo.done)).toEqual([true, true, false, false]);
  expect(store.todoList.map(todo => todo.id)).toEqual(['2', '1', '4', '5']);
  expect(store.todoList[0] === tea).toBe(true);
  expect(store.todoList[1] === coffee).toBe(true);
  expect(store.todoList[2] === biscuit).toBe(false);
});

it('correctly reconciliate when swapping', () => {
  const Task = types.model('Task', {});
  const Store = types.model('', {
    todoList: types.optional(types.array(Task), []),
  });
  const s = Store.create();

  unprotect(s);

  const a = Task.create();
  const b = Task.create();

  s.todoList.push(a, b);
  s.todoList.replace([b, a]);
  expect(s.todoList[0] === b).toBe(true);
  expect(s.todoList[1] === a).toBe(true);
  expect(s.todoList.map(getPath)).toEqual(['/todoList/0', '/todoList/1']);
});

it('correctly reconciliate when swapping using snapshots', () => {
  const Task = types.model('Task', {});
  const Store = types.model('', {
    todoList: types.array(Task),
  });
  const s = Store.create();

  unprotect(s);

  const a = Task.create();
  const b = Task.create();

  s.todoList.push(a, b);
  s.todoList.replace([getSnapshot(b), getSnapshot(a)]);
  expect(s.todoList[0] === b).toBe(true);
  expect(s.todoList[1] === a).toBe(true);
  expect(s.todoList.map(getPath)).toEqual(['/todoList/0', '/todoList/1']);
  s.todoList.push({});
  expect(s.todoList[0] === b).toBe(true);
  expect(s.todoList[1] === a).toBe(true);
  expect(s.todoList.map(getPath)).toEqual(['/todoList/0', '/todoList/1', '/todoList/2']);
});

it('should not be allowed to add the same item twice to the same store', () => {
  const Task = types.model('Task', {});
  const Store = types.model('', {
    todoList: types.optional(types.array(Task), []),
  });
  const s = Store.create();

  unprotect(s);

  const a = Task.create();

  s.todoList.push(a);
  expect(() => {
    s.todoList.push(a);
  }).toThrowError(
    // eslint-disable-next-line max-len
    "Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '/todoList/1', but it lives already at '/todoList/0'"
  );
  const b = Task.create();

  expect(() => {
    s.todoList.push(b, b);
  }).toThrowError(
    // eslint-disable-next-line max-len
    "Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '/todoList/2', but it lives already at '/todoList/1'"
  );
});

it('should support observable arrays', () => {
  const TestArray = types.array(types.number);
  const testArray = TestArray.create(observable([1, 2]));

  expect(testArray[0] === 1).toBe(true);
  expect(testArray.length === 2).toBe(true);
  expect(Array.isArray(testArray.slice())).toBe(true);
});

test("it should support observable arrays, array should be real when useProxies eq 'always'", () => {
  configure({
    useProxies: 'always',
  });

  const TestArray = types.array(types.number);
  const testArray = TestArray.create(observable([1, 2]));

  expect(testArray[0] === 1).toBe(true);
  expect(testArray.length === 2).toBe(true);
  expect(Array.isArray(testArray)).toBe(true);
});

test("it should support observable arrays, array should be not real when useProxies eq 'never'", () => {
  configure({
    useProxies: 'never',
  });

  const TestArray = types.array(types.number);
  const testArray = TestArray.create(observable([1, 2]));

  expect(testArray[0] === 1).toBe(true);
  expect(testArray.length === 2).toBe(true);
  expect(Array.isArray(testArray.slice())).toBe(true);
  expect(Array.isArray(testArray)).toBe(false);
});

it('should correctly handle re-adding of the same objects', () => {
  const Store = types
    .model('Task', {
      objects: types.array(types.maybe(types.frozen())),
    })
    .actions(self => ({
      // eslint-disable-next-line @typescript-eslint/ban-types
      setObjects(objects: {}[]) {
        self.objects.replace(objects);
      },
    }));
  const store = Store.create({
    objects: [],
  });

  expect(store.objects.slice()).toEqual([]);

  const someObject = {};

  store.setObjects([someObject]);
  expect(store.objects.slice()).toEqual([someObject]);
  store.setObjects([someObject]);
  expect(store.objects.slice()).toEqual([someObject]);
});

it('should work correctly for splicing primitive array', () => {
  const store = types.array(types.number).create([1, 2, 3]);

  unprotect(store);
  store.splice(0, 1);
  expect(store.slice()).toEqual([2, 3]);
  store.unshift(1);
  expect(store.slice()).toEqual([1, 2, 3]);
  store.replace([4, 5]);
  expect(store.slice()).toEqual([4, 5]);
  store.clear();
  expect(store.slice()).toEqual([]);
});

it('should keep unchanged for structural equalled snapshot', () => {
  const Store = types.model('', {
    todoList: types.array(
      types.model('Task', {
        id: types.identifier,
        task: '',
        done: false,
      })
    ),
    numbers: types.array(types.number),
  });
  const store = Store.create({
    todoList: [
      { id: '1', task: 'coffee', done: false },
      { id: '2', task: 'tea', done: false },
      { id: '3', task: 'biscuit', done: false },
    ],
    numbers: [1, 2, 3],
  });

  const values: boolean[][] = [];

  autorun(() => {
    values.push(store.todoList.map(todo => todo.done));
  });

  applySnapshot(store.todoList, [
    { id: '1', task: 'coffee', done: false },
    { id: '2', task: 'tea', done: false },
    { id: '3', task: 'biscuit', done: true },
  ]);
  applySnapshot(store.todoList, [
    { id: '1', task: 'coffee', done: false },
    { id: '2', task: 'tea', done: false },
    { id: '3', task: 'biscuit', done: true },
  ]);
  expect(values).toEqual([
    [false, false, false],
    [false, false, true],
  ]);

  const values1: number[][] = [];

  autorun(() => {
    values1.push(store.numbers.slice());
  });

  applySnapshot(store.numbers, [1, 2, 4]);
  applySnapshot(store.numbers, [1, 2, 4]);
  expect(values1).toEqual([
    [1, 2, 3],
    [1, 2, 4],
  ]);
});

// === OPERATIONS TESTS ===
test("#1105 - it should return pop/shift'ed values for scalar arrays", () => {
  const ScalarArray = types
    .model('', {
      array: types.array(types.number),
    })
    .actions(self => ({
      shift() {
        return self.array.shift();
      },
    }));

  const test = ScalarArray.create({ array: [3, 5] });

  expect(test.shift()).toEqual(3);
  expect(test.shift()).toEqual(5);
});

test("it should return pop/shift'ed values for object arrays", () => {
  const TestObject = types.model('', { id: types.string });
  const ObjectArray = types
    .model('', {
      array: types.array(TestObject),
    })
    .actions(self => ({
      shift() {
        return self.array.shift();
      },
      pop() {
        return self.array.pop();
      },
    }));

  const test = ObjectArray.create({
    array: [{ id: 'foo' }, { id: 'mid' }, { id: 'bar' }],
  });

  const foo = test.shift()!;

  expect(isAlive(foo)).toBe(false);

  const bar = test.pop()!;

  expect(isAlive(bar)).toBe(false);

  // we have to use clone or getSnapshot to access dead nodes data
  expect(clone(foo)).toEqual({ id: 'foo' });
  expect(getSnapshot(bar)).toEqual({ id: 'bar' });
});

it('#1173 - detaching an array should not eliminate its children', () => {
  const M = types.model('', {});
  const AM = types.array(M);
  const Store = types.model('', { items: AM });
  const s = Store.create({ items: [{}, {}, {}] });
  const n0 = s.items[0]!;

  unprotect(s);

  const detachedItems = detach(s.items);

  expect(s.items).not.toBe(detachedItems);
  expect(s.items.length).toBe(0);
  expect(detachedItems.length).toBe(3);
  expect(detachedItems[0]).toBe(n0);
});

it('initializing an array instance from another array instance should end up in the same instance', () => {
  const A = types.array(types.number);
  const a1 = A.create([1, 2, 3]);
  const a2 = A.create(a1);

  expect(a1).toBe(a2);
  expect(getSnapshot(a1)).toEqual([1, 2, 3]);
});

it('assigning filtered instances works', () => {
  const Task = types.model('Task', {
    done: false,
  });
  const store = types
    .model('', {
      todoList: types.array(Task),
    })
    .actions(self => ({
      clearFinishedtodoList() {
        self.todoList = cast(self.todoList.filter(todo => !todo.done));
      },
    }))
    .create({
      todoList: [{ done: true }, { done: false }, { done: true }],
    });

  expect(store.todoList.length).toBe(3);

  const done = store.todoList.filter(t => t.done);
  const notDone = store.todoList.filter(t => !t.done);

  expect(store.todoList.every(t => isAlive(t))).toBeTruthy();

  store.clearFinishedtodoList();

  expect(store.todoList.length).toBe(1);
  expect(store.todoList[0]).toBe(notDone[0]);
  expect(done.every(t => !isAlive(t))).toBe(true);
  expect(notDone.every(t => isAlive(t))).toBe(true);
});
