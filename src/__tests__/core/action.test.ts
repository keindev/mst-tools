import { configure } from 'mobx';

import { types } from '../../index';
import {
    addMiddleware, applyPatch, applySnapshot, cast, getRoot, getSnapshot, IMiddlewareEvent, Instance,
    ISerializedActionCall, onAction, recordActions,
} from '../../mst/index';

// Simple action replay and invocation
const Task = types
  .model('Task', {
    done: types.flag,
  })
  .actions(self => ({
    toggle() {
      self.done = !self.done;

      return self.done;
    },
  }));

// eslint-disable-next-line max-lines-per-function
describe('[core] Actions', () => {
  it('should be possible to invoke a simple action', () => {
    const t1 = Task.create();

    expect(t1.done).toBe(false);
    expect(t1.toggle()).toBe(true);
    expect(t1.done).toBe(true);
  });

  it('should be possible to record & replay a simple action', () => {
    const t1 = Task.create();
    const t2 = Task.create();

    expect(t1.done).toBe(false);
    expect(t2.done).toBe(false);

    const recorder = recordActions(t1);

    t1.toggle();
    t1.toggle();
    t1.toggle();

    expect(recorder.actions).toEqual([
      { name: 'toggle', path: '', args: [] },
      { name: 'toggle', path: '', args: [] },
      { name: 'toggle', path: '', args: [] },
    ]);
    recorder.replay(t2);

    expect(t2.done).toBe(true);
  });

  it('applying patches should be recordable and replayable', () => {
    const t1 = Task.create();
    const t2 = Task.create();
    const recorder = recordActions(t1);

    expect(t1.done).toBe(false);

    applyPatch(t1, { op: 'replace', path: '/done', value: true });

    expect(t1.done).toBe(true);
    expect(recorder.actions).toEqual([
      {
        name: '@APPLY_PATCHES',
        path: '',
        args: [[{ op: 'replace', path: '/done', value: true }]],
      },
    ]);

    recorder.replay(t2);

    expect(t2.done).toBe(true);
  });

  it('applying patches should be replacing the root store', () => {
    const t1 = Task.create();
    const recorder = recordActions(t1);

    expect(t1.done).toBe(false);
    applyPatch(t1, { op: 'replace', path: '', value: { done: true } });
    expect(t1.done).toBe(true);
    expect(recorder.actions).toEqual([
      {
        name: '@APPLY_PATCHES',
        path: '',
        args: [[{ op: 'replace', path: '', value: { done: true } }]],
      },
    ]);
  });

  it('applying snapshots should be recordable and replayable', () => {
    const t1 = Task.create();
    const t2 = Task.create();
    const recorder = recordActions(t1);

    expect(t1.done).toBe(false);
    applySnapshot(t1, { done: true });
    expect(t1.done).toBe(true);
    expect(recorder.actions).toEqual([
      {
        name: '@APPLY_SNAPSHOT',
        path: '',
        args: [{ done: true }],
      },
    ]);
    recorder.replay(t2);
    expect(t2.done).toBe(true);
  });

  // Complex actions
  const Customer = types.model('Customer', {
    id: types.identifierNumber,
    name: types.string,
  });
  const Order = types
    .model('Order', {
      customer: types.maybeNull(types.reference(Customer)),
    })
    .actions(self => ({
      setCustomer(customer: Instance<typeof Customer>) {
        self.customer = customer;
      },
      noopSetCustomer(_: Instance<typeof Customer>) {
        // noop
      },
    }));

  const OrderStore = types.model('OrderStore', {
    customers: types.array(Customer),
    orders: types.array(Order),
  });

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function createTestStore() {
    const store = OrderStore.create({ customers: [{ id: 1, name: 'Bob' }], orders: [{ customer: null }] });

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onAction(store, () => {});

    return store;
  }

  it('should not be possible to pass a complex object', () => {
    const store = createTestStore();
    const recorder = recordActions(store);

    expect(store.customers[0]!.name).toBe('Bob');

    store.orders[0]!.setCustomer(store.customers[0]!);

    expect(store.orders[0]!.customer!.name).toBe('Bob');
    expect(store.orders[0]!.customer).toBe(store.customers[0]);

    expect(getSnapshot(store)).toEqual({
      customers: [{ id: 1, name: 'Bob' }],
      orders: [{ customer: 1 }],
    });
    expect(recorder.actions).toEqual([
      {
        name: 'setCustomer',
        path: '/orders/0',
        args: [{ $MST_UNSERIALIZABLE: true, type: '[MSTNode: Customer]' }],
      },
    ]);
  });

  it('should not be possible to set the wrong type', () => {
    const store = createTestStore();

    expect(() => {
      store.orders[0]!.setCustomer(store.orders[0] as any);
    }).toThrowError(
      'Error while converting <Order@/orders/0> to `(reference(Customer) | null)`:\n\n    ' +
        // eslint-disable-next-line max-len
        'value of type Order: <Order@/orders/0> is not assignable to type: `(reference(Customer) | null)`, expected an instance of `(reference(Customer) | null)` or a snapshot like `(reference(Customer) | null?)` instead.'
    ); // wrong type!
  });

  it('should not be possible to pass the element of another tree', () => {
    const store1 = createTestStore();
    const store2 = createTestStore();
    const recorder = recordActions(store2);

    store2.orders[0]!.setCustomer(store1.customers[0]!);

    expect(recorder.actions).toEqual([
      {
        name: 'setCustomer',
        path: '/orders/0',
        args: [
          {
            $MST_UNSERIALIZABLE: true,
            type: '[MSTNode: Customer]',
          },
        ],
      },
    ]);
  });

  it('should not be possible to pass an unserializable object', () => {
    const store = createTestStore();
    const circular = { a: null as any };

    circular.a = circular;

    const recorder = recordActions(store);

    store.orders[0]!.noopSetCustomer(circular as any);
    store.orders[0]!.noopSetCustomer(Buffer.from('bla') as any);

    // fix for newer node versions, which include extra data on dev mode
    if (recorder.actions[0]!.args![0].type.startsWith('TypeError: Converting circular structure to JSON')) {
      recorder.actions[0]!.args![0].type = 'TypeError: Converting circular structure to JSON';
    }

    expect(recorder.actions).toEqual([
      {
        args: [
          {
            $MST_UNSERIALIZABLE: true,
            type: 'TypeError: Converting circular structure to JSON',
          },
        ],
        name: 'noopSetCustomer',
        path: '/orders/0',
      },
      {
        args: [
          {
            $MST_UNSERIALIZABLE: true,
            type: '[object Buffer]',
          },
        ],
        name: 'noopSetCustomer',
        path: '/orders/0',
      },
    ]);
  });

  it('should be possible to pass a complex plain object', () => {
    const t1 = Task.create();
    const t2 = Task.create();
    const recorder = recordActions(t1);

    (t1 as any).toggle({ bla: ['none', ['said']] }); // nonsense, but serializable!

    expect(recorder.actions).toEqual([{ name: 'toggle', path: '', args: [{ bla: ['none', ['said']] }] }]);
    recorder.replay(t2);
    expect(t2.done).toBe(true);
  });

  it('action should be bound', () => {
    const task = Task.create();
    const f = task.toggle;

    expect(f()).toBe(true);
    expect(task.done).toBe(true);
  });

  it('snapshot should be available and updated during an action', () => {
    const Model = types
      .model('Model', {
        x: types.number,
      })
      .actions(self => ({
        inc() {
          self.x += 1;

          const res = getSnapshot(self).x;

          self.x += 1;

          return res;
        },
      }));

    const a = Model.create({ x: 2 });

    expect(a.inc()).toBe(3);
    expect(a.x).toBe(4);
    expect(getSnapshot(a).x).toBe(4);
  });

  it('indirectly called private functions should be able to modify state', () => {
    const Model = types
      .model('Model', {
        x: 3,
      })
      .actions(self => ({
        inc() {
          self.x += 1;
        },
        dec() {
          self.x += -1;
        },
      }));
    const cnt = Model.create();

    expect(cnt.x).toBe(3);
    cnt.dec();
    expect(cnt.x).toBe(2);
    expect((cnt as any).incrementBy).toBe(undefined);
  });

  it('volatile state survives reconciliation', () => {
    const Model = types.model('Model', { x: 3 }).actions(self => {
      let incrementor = 1;

      return {
        setIncrementor(value: number) {
          incrementor = value;
        },
        inc() {
          self.x += incrementor;
        },
      };
    });

    const Store = types.model('Store', { cnt: types.optional(Model, {}) });
    const store = Store.create();

    store.cnt.inc();
    expect(store.cnt.x).toBe(4);
    store.cnt.setIncrementor(3);
    store.cnt.inc();
    expect(store.cnt.x).toBe(7);
    applySnapshot(store, { cnt: { x: 2 } });
    expect(store.cnt.x).toBe(2);
    store.cnt.inc();
    expect(store.cnt.x).toBe(5); // incrementor was not lost
  });

  it('middleware events are correct', () => {
    configure({
      useProxies: 'never',
    });

    const A = types.model('', {}).actions(() => ({
      a(x: number) {
        return this.b(x * 2);
      },
      b(y: number) {
        return y + 1;
      },
    }));
    const a = A.create();
    const events: IMiddlewareEvent[] = [];

    // eslint-disable-next-line prefer-arrow-callback
    addMiddleware(a, function (call, next) {
      events.push(call);

      return next(call);
    });

    a.a(7);
    const event1 = {
      args: [7],
      context: {},
      id: 29,
      name: 'a',
      parentId: 0,
      rootId: 29,
      allParentIds: [],
      tree: {},
      type: 'action',
      parentEvent: undefined,
      parentActionEvent: undefined,
    };
    const event2 = {
      args: [14],
      context: {},
      id: 30,
      name: 'b',
      parentId: 29,
      rootId: 29,
      allParentIds: [29],
      tree: {},
      type: 'action',
      parentEvent: event1,
      parentActionEvent: event1,
    };

    expect(events).toEqual([event1, event2]);
  });

  it('actions are mockable', () => {
    configure({
      useProxies: 'never',
    });

    const M = types
      .model('')
      .actions(() => ({
        method(): number {
          return 3;
        },
      }))
      .views(() => ({
        view(): number {
          return 3;
        },
      }));

    const m = M.create();

    m.method = () => 4;
    expect(m.method()).toBe(4);

    m.view = () => 4;
    expect(m.view()).toBe(4);
  });

  it('after attach action should work correctly', () => {
    const Todo = types
      .model('Todo', {
        title: 'test',
      })
      .actions(self => ({
        remove() {
          getRoot<typeof S>(self).remove(cast(self));
        },
      }));
    const S = types
      .model('S', {
        todoList: types.array(Todo),
      })
      .actions(self => ({
        remove(todo: Instance<typeof Todo>) {
          self.todoList.remove(todo);
        },
      }));

    const s = S.create({
      todoList: [{ title: 'todo' }],
    });
    const events: ISerializedActionCall[] = [];

    onAction(
      s,
      call => {
        events.push(call);
      },
      true
    );

    s.todoList[0]!.remove();

    expect(events).toEqual([
      {
        args: [],
        name: 'remove',
        path: '/todoList/0',
      },
    ]);
  });
});
