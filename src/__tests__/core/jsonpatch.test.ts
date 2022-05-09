import { configure } from 'mobx';

import { types } from '../../index';
import {
    cast, escapeJsonPath, getPath, getSnapshot, IAnyModelType, IJsonPatch, IMSTMap, Instance, IType, joinJsonPath,
    recordPatches, resolvePath, splitJsonPath, unprotect,
} from '../../mst/index';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function testPatches<C, S, T>(type: IType<C, S, T>, snapshot: C, fn: any, expectedPatches: IJsonPatch[]) {
  configure({
    enforceActions: 'never',
  });

  const instance = type.create(snapshot);
  const baseSnapshot = getSnapshot(instance);
  const recorder = recordPatches(instance);

  unprotect(instance);
  fn(instance);
  recorder.stop();
  expect(recorder.patches).toEqual(expectedPatches);

  const clone = type.create(snapshot);

  recorder.replay(clone);
  expect(getSnapshot(clone)).toEqual(getSnapshot(instance));
  recorder.undo();
  expect(getSnapshot(instance)).toEqual(baseSnapshot);
}

const Node = types.model('Node', {
  id: types.identifierNumber,
  text: 'Hi',
  children: types.optional(types.array(types.late((): IAnyModelType => Node)), []),
});

// eslint-disable-next-line jest/expect-expect
it('should apply simple patch', () => {
  configure({
    enforceActions: 'never',
  });

  testPatches(
    Node,
    { id: 1 },
    (n: Instance<typeof Node>) => {
      n.text = 'test';
    },
    [
      {
        op: 'replace',
        path: '/text',
        value: 'test',
      },
    ]
  );
});

// eslint-disable-next-line jest/expect-expect
it('should apply deep patches to arrays', () => {
  testPatches(
    Node,
    { id: 1, children: [{ id: 2 }] },
    (n: Instance<typeof Node>) => {
      const children = n.children as unknown as Instance<typeof Node>[];

      children[0]!.text = 'test'; // update
      children[0] = cast({ id: 2, text: 'world' }); // this reconciles; just an update
      children[0] = cast({ id: 4, text: 'coffee' }); // new object
      children[1] = cast({ id: 3, text: 'world' }); // addition
      children.splice(0, 1); // removal
    },
    [
      {
        op: 'replace',
        path: '/children/0/text',
        value: 'test',
      },
      {
        op: 'replace',
        path: '/children/0/text',
        value: 'world',
      },
      {
        op: 'replace',
        path: '/children/0',
        value: {
          id: 4,
          text: 'coffee',
          children: [],
        },
      },
      {
        op: 'add',
        path: '/children/1',
        value: {
          id: 3,
          text: 'world',
          children: [],
        },
      },
      {
        op: 'remove',
        path: '/children/0',
      },
    ]
  );
});

// eslint-disable-next-line jest/expect-expect
it('should apply deep patches to arrays with object instances', () => {
  testPatches(
    Node,
    { id: 1, children: [{ id: 2 }] },
    (n: Instance<typeof Node>) => {
      const children = n.children as unknown as Instance<typeof Node>[];

      children[0]!.text = 'test'; // update
      children[0] = Node.create({ id: 2, text: 'world' }); // this does not reconcile, new instance is provided
      children[0] = Node.create({ id: 4, text: 'coffee' }); // new object
    },
    [
      {
        op: 'replace',
        path: '/children/0/text',
        value: 'test',
      },
      {
        op: 'replace',
        path: '/children/0',
        value: {
          id: 2,
          text: 'world',
          children: [],
        },
      },
      {
        op: 'replace',
        path: '/children/0',
        value: {
          id: 4,
          text: 'coffee',
          children: [],
        },
      },
    ]
  );
});

// eslint-disable-next-line jest/expect-expect
it('should apply non flat patches', () => {
  testPatches(
    Node,
    { id: 1 },
    (n: Instance<typeof Node>) => {
      const children = n.children as unknown as Instance<typeof Node>[];

      children.push(
        cast({
          id: 2,
          children: [{ id: 4 }, { id: 5, text: 'Tea' }],
        })
      );
    },
    [
      {
        op: 'add',
        path: '/children/0',
        value: {
          id: 2,
          text: 'Hi',
          children: [
            {
              id: 4,
              text: 'Hi',
              children: [],
            },
            {
              id: 5,
              text: 'Tea',
              children: [],
            },
          ],
        },
      },
    ]
  );
});

// eslint-disable-next-line jest/expect-expect
it('should apply non flat patches with object instances', () => {
  testPatches(
    Node,
    { id: 1 },
    (n: Instance<typeof Node>) => {
      const children = n.children as unknown as Instance<typeof Node>[];

      children.push(
        Node.create({
          id: 2,
          children: [{ id: 5, text: 'Tea' }],
        })
      );
    },
    [
      {
        op: 'add',
        path: '/children/0',
        value: {
          id: 2,
          text: 'Hi',
          children: [
            {
              id: 5,
              text: 'Tea',
              children: [],
            },
          ],
        },
      },
    ]
  );
});

// eslint-disable-next-line jest/expect-expect
it('should apply deep patches to maps', () => {
  // If user does not transpile const/let to var, trying to call Late' subType
  // property getter during map's tryCollectModelTypes() will throw ReferenceError.
  // But if it's transpiled to var, then subType will become 'undefined'.
  const NodeMap = types.model('NodeMap', {
    id: types.identifierNumber,
    text: 'Hi',
    children: types.optional(types.map(types.late((): IAnyModelType => NodeMap)), {}),
  });

  testPatches(
    NodeMap,
    { id: 1, children: { 2: { id: 2 } } },
    (n: Instance<typeof NodeMap>) => {
      const children = n.children as IMSTMap<typeof NodeMap>;

      children.get('2')!.text = 'test'; // update
      children.put({ id: 2, text: 'world' }); // this reconciles; just an update
      children.set('4', NodeMap.create({ id: 4, text: 'coffee', children: { 23: { id: 23 } } })); // new object
      children.put({ id: 3, text: 'world', children: { 7: { id: 7 } } }); // addition
      children.delete('2'); // removal
    },
    [
      {
        op: 'replace',
        path: '/children/2/text',
        value: 'test',
      },
      {
        op: 'replace',
        path: '/children/2/text',
        value: 'world',
      },
      {
        op: 'add',
        path: '/children/4',
        value: {
          children: {
            23: {
              children: {},
              id: 23,
              text: 'Hi',
            },
          },
          id: 4,
          text: 'coffee',
        },
      },
      {
        op: 'add',
        path: '/children/3',
        value: {
          children: {
            7: {
              children: {},
              id: 7,
              text: 'Hi',
            },
          },
          id: 3,
          text: 'world',
        },
      },
      {
        op: 'remove',
        path: '/children/2',
      },
    ]
  );
});

// eslint-disable-next-line jest/expect-expect
it('should apply deep patches to objects', () => {
  configure({
    enforceActions: 'never',
  });

  const NodeObject = types.model('NodeObject', {
    id: types.identifierNumber,
    text: 'Hi',
    child: types.maybe(types.late((): IAnyModelType => NodeObject)),
  });

  testPatches(
    NodeObject,
    { id: 1, child: { id: 2 } },
    (n: Instance<typeof NodeObject>) => {
      n.child!.text = 'test'; // update
      n.child = cast({ id: 2, text: 'world' }); // this reconciles; just an update
      n.child = NodeObject.create({ id: 2, text: 'coffee', child: { id: 23 } });
      n.child = cast({ id: 3, text: 'world', child: { id: 7 } }); // addition
      n.child = undefined; // removal
    },
    [
      {
        op: 'replace',
        path: '/child/text',
        value: 'test',
      },
      {
        op: 'replace',
        path: '/child/text',
        value: 'world',
      },
      {
        op: 'replace',
        path: '/child',
        value: {
          child: {
            child: undefined,
            id: 23,
            text: 'Hi',
          },
          id: 2,
          text: 'coffee',
        },
      },
      {
        op: 'replace',
        path: '/child',
        value: {
          child: {
            child: undefined,
            id: 7,
            text: 'Hi',
          },
          id: 3,
          text: 'world',
        },
      },
      {
        op: 'replace',
        path: '/child',
        value: undefined,
      },
    ]
  );
});

it('should correctly split/join json patches', () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function isValid(str: string, array: string[], altStr?: string) {
    expect(splitJsonPath(str)).toEqual(array);
    expect(joinJsonPath(array)).toBe(altStr !== undefined ? altStr : str);
  }

  isValid('', []);
  isValid('/', ['']);
  isValid('//', ['', '']);
  isValid('/a', ['a']);
  isValid('/a/', ['a', '']);
  isValid('/a//', ['a', '', '']);
  isValid('.', ['.']);
  isValid('..', ['..']);
  isValid('./a', ['.', 'a']);
  isValid('../a', ['..', 'a']);
  isValid('/.a', ['.a']);
  isValid('/..a', ['..a']);

  // rooted relatives are equivalent to plain relatives
  isValid('/.', ['.'], '.');
  isValid('/..', ['..'], '..');
  isValid('/./a', ['.', 'a'], './a');
  isValid('/../a', ['..', 'a'], '../a');

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function isInvalid(str: string) {
    expect(() => {
      splitJsonPath(str);
    }).toThrow('a json path must be either rooted, empty or relative');
  }

  isInvalid('a');
  isInvalid('a/');
  isInvalid('a//');
  isInvalid('.a');
  isInvalid('.a/');
  isInvalid('..a');
  isInvalid('..a/');
});

it('should correctly escape/unescape json patches', () => {
  configure({
    enforceActions: 'never',
  });

  expect(escapeJsonPath('http://example.com')).toBe('http:~1~1example.com');

  const AppStore = types.model('', {
    items: types.map(types.frozen<any>()),
  });

  testPatches(
    AppStore,
    { items: {} },
    (store: typeof AppStore.Type) => {
      store.items.set('with/slash~tilde', 1);
    },
    [{ op: 'add', path: '/items/with~1slash~0tilde', value: 1 }]
  );
});

it('weird keys are handled correctly', () => {
  const Store = types.model('', {
    map: types.map(
      types.model('', {
        model: types.model('', {
          value: types.string,
        }),
      })
    ),
  });

  const store = Store.create({
    map: {
      '': { model: { value: 'val1' } },
      '/': { model: { value: 'val2' } },
      '~': { model: { value: 'val3' } },
    },
  });

  {
    const target = store.map.get('')!.model;
    const path = getPath(target);

    expect(path).toBe('/map//model');
    expect(resolvePath(store, path)).toBe(target);
  }
  {
    const target = store.map.get('/')!.model;
    const path = getPath(target);

    expect(path).toBe('/map/~1/model');
    expect(resolvePath(store, path)).toBe(target);
  }
  {
    const target = store.map.get('~')!.model;
    const path = getPath(target);

    expect(path).toBe('/map/~0/model');
    expect(resolvePath(store, path)).toBe(target);
  }
});

it('relativePath with a different base than the root works correctly', () => {
  const Store = types.model('', {
    map: types.map(
      types.model('', {
        model: types.model('', {
          value: types.string,
        }),
      })
    ),
  });

  const store = Store.create({
    map: {
      '1': { model: { value: 'val1' } },
      '2': { model: { value: 'val2' } },
    },
  });

  {
    const target = store.map.get('1')!.model;

    expect(resolvePath(store.map, './1/model')).toBe(target);
    expect(resolvePath(store.map, '../map/1/model')).toBe(target);
    // rooted relative should resolve to the given base as root
    expect(resolvePath(store.map, '/./1/model')).toBe(target);
    expect(resolvePath(store.map, '/../map/1/model')).toBe(target);
  }
  {
    const target = store.map.get('2')!.model;

    expect(resolvePath(store.map, './2/model')).toBe(target);
    expect(resolvePath(store.map, '../map/2/model')).toBe(target);
    // rooted relative should resolve to the given base as root
    expect(resolvePath(store.map, '/./2/model')).toBe(target);
    expect(resolvePath(store.map, '/../map/2/model')).toBe(target);
  }
});
