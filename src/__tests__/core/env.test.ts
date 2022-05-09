import { configure } from 'mobx';

import { types } from '../../index';
import {
    castToSnapshot, clone, destroy, detach, getEnv, getParent, getPath, hasParent, IAnyStateTreeNode, Instance, isAlive,
    isStateTreeNode, unprotect, walk,
} from '../../mst/index';

const Todo = types
  .model('', {
    title: 'test',
  })
  .views(self => ({
    get description() {
      return getEnv(self).useUppercase ? self.title.toUpperCase() : self.title;
    },
  }));
const Store = types.model('', {
  todoList: types.array(Todo),
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEnvironment() {
  return {
    useUppercase: true,
  };
}

it('should be possible to use environments', () => {
  const env = createEnvironment();
  const todo = Todo.create({}, env);

  expect(todo.description).toBe('TEST');
  env.useUppercase = false;
  expect(todo.description).toBe('test');
});
it('should be possible to inherit environments', () => {
  const env = createEnvironment();
  const store = Store.create({ todoList: [{}] }, env);

  expect(store.todoList[0]!.description).toBe('TEST');
  env.useUppercase = false;
  expect(store.todoList[0]!.description).toBe('test');
});

it('getEnv returns empty object without environment', () => {
  const todo = Todo.create();

  expect(getEnv(todo)).toEqual({});
});

it('detach should preserve environment', () => {
  const env = createEnvironment();
  const store = Store.create({ todoList: [{}] }, env);

  unprotect(store);

  const todo = detach(store.todoList[0]);

  expect(todo!.description).toBe('TEST');
  env.useUppercase = false;
  expect(todo!.description).toBe('test');
});

it('is possible to assign instance with the same environment as the parent to a tree', () => {
  configure({
    enforceActions: 'never',
  });

  const env = createEnvironment();
  const store = Store.create({ todoList: [] }, env);
  const todo = Todo.create({}, env);

  unprotect(store);
  store.todoList.push(todo);
  expect(store.todoList.length === 1).toBe(true);
  expect(getEnv(store.todoList) === getEnv(store.todoList[0])).toBe(true);
  expect(getEnv(todo) === getEnv(store.todoList[0])).toBe(true);
});

it('is not possible to assign instance with a different environment than the parent to a tree', () => {
  configure({
    enforceActions: 'never',
  });

  const env1 = createEnvironment();
  const env2 = createEnvironment();
  const store = Store.create({ todoList: [] }, env1);
  const todo = Todo.create({}, env2);

  unprotect(store);
  // eslint-disable-next-line jest/no-conditional-expect
  expect(() => store.todoList.push(todo)).toThrowError(
    // eslint-disable-next-line max-len
    '[mobx-state-tree] A state tree cannot be made part of another state tree as long as their environments are different.'
  );
});

it('is possible to set a value inside a map of a map when using the same environment', () => {
  configure({
    enforceActions: 'never',
  });

  const env = createEnvironment();
  const EmptyModel = types.model('', {});
  const MapOfEmptyModel = types.model('', {
    map: types.map(EmptyModel),
  });
  const MapOfMapOfEmptyModel = types.model('', {
    map: types.map(MapOfEmptyModel),
  });
  const mapOfMap = MapOfMapOfEmptyModel.create(
    {
      map: {
        whatever: {
          map: {},
        },
      },
    },
    env
  );

  unprotect(mapOfMap);
  // this should not throw
  mapOfMap.map.get('whatever')!.map.set('1234', EmptyModel.create({}, env));
  expect(getEnv(mapOfMap) === env).toBe(true);
  expect(getEnv(mapOfMap.map.get('whatever')!.map.get('1234')!) === env).toBe(true);
});

it('clone preserves environnment', () => {
  const env = createEnvironment();
  const store = Store.create({ todoList: [{}] }, env);

  {
    const todo = clone(store.todoList[0]);

    expect(getEnv(todo) === env).toBe(true);
  }

  {
    const todo = clone(store.todoList[0], true);

    expect(getEnv(todo) === env).toBe(true);
  }

  {
    const todo = clone(store.todoList[0], false);

    expect(getEnv(todo)).toEqual({});
  }

  {
    const env2 = createEnvironment();
    const todo = clone(store.todoList[0], env2);

    expect(env2 === getEnv(todo)).toBe(true);
  }
});

it('#1231', () => {
  configure({
    useProxies: 'never',
  });

  const envObj = createEnvironment();
  const logs: string[] = [];

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function nofParents(node: IAnyStateTreeNode) {
    let parents = 0;
    let parent = node;

    while (hasParent(parent)) {
      parents++;
      parent = getParent(parent);
    }

    return parents;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function leafsFirst(root: IAnyStateTreeNode) {
    const nodes: IAnyStateTreeNode[] = [];

    walk(root, i => {
      if (isStateTreeNode(i)) {
        nodes.push(i);
      }
    });
    // sort by number of parents
    nodes.sort((a, b) => nofParents(b) - nofParents(a));

    return nodes;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function check(root: Instance<typeof RS>, name: string, mode: 'detach' | 'destroy') {
    configure({
      enforceActions: 'never',
    });

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    function logFail(operation: string, n: any) {
      logs.push(`fail: (${name}) ${operation}: ${getPath(n)}, ${n}`);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    function log(operation: string, n: any) {
      logs.push(`ok: (${name}) ${operation}: ${getPath(n)}, ${n}`);
    }

    // make sure all nodes are there
    // eslint-disable-next-line no-unused-expressions
    root.s1.arr[0]!.title;
    // eslint-disable-next-line no-unused-expressions
    root.s1.m.get('one')!.title;
    // eslint-disable-next-line no-unused-expressions
    root.s2;

    const nodes = leafsFirst(root);

    expect(nodes.length).toBe(7);

    nodes.forEach(i => {
      const env = getEnv(i);
      const parent = hasParent(i);

      if (!parent && i !== root) {
        logFail('expected a parent, but none found', i);
      } else {
        log('had parent or was root', i);
      }
      if (env !== envObj) {
        logFail('expected same env as root, but was different', i);
      } else {
        log('same env as root', i);
      }
    });

    unprotect(root);
    nodes.forEach(i => {
      const optional = optionalPaths.includes(getPath(i));

      if (mode === 'detach') {
        log('detaching node', i);
        detach(i);
      } else {
        log('destroying node', i);
        destroy(i);
      }
      const env = getEnv(i);
      const parent = hasParent(i);
      const alive = isAlive(i);

      if (mode === 'detach') {
        if (parent) {
          logFail('expected no parent after detach, but one was found', i);
        } else {
          log('no parent after detach', i);
        }
        if (env !== envObj) {
          logFail('expected same env as root after detach, but it was not', i);
        } else {
          log('env kept after detach', i);
        }
        if (!alive) {
          logFail('expected to be alive after detach, but it was not', i);
        } else {
          log('alive after detach', i);
        }
      } else {
        // destroy might or might not keep the env, but doesn't matter so we don't check
        if (optional) {
          // optional (undefined) nodes will be assigned undefined and reconciled, therefore they will be kept alive
          if (!parent) {
            logFail('expected a parent after destroy (since it is optional), but none was found', i);
          } else {
            log('had parent after destroy (since it is optional)', i);
          }
          if (!alive) {
            logFail('expected to be alive after destroy (since it is optional), but it was not', i);
          } else {
            log('alive after destroy (since it is optional)', i);
          }
        } else {
          if (parent) {
            logFail('expected no parent after destroy, but one was found', i);
          } else {
            log('no parent after destroy', i);
          }
          if (alive) {
            logFail('expected to be dead after destroy, but it was not', i);
          } else {
            log('dead after destroy', i);
          }
        }
      }
    });
  }

  const T = types.model('T', { title: 'some title' });

  const S1Arr = types.array(T);
  const S1Map = types.map(T);
  const S1 = types.model('S1', {
    arr: S1Arr,
    m: S1Map,
  });

  const S2 = types.model('S2', {});

  const RS = types.model('RS', {
    s1: types.optional(S1, {}),
    s2: types.optional(S2, {}),
  });

  const optionalPaths = ['/s1', '/s2', '/s1/m', '/s1/arr'];

  const data = {
    s1: castToSnapshot(
      S1.create({
        arr: S1Arr.create([T.create({})]),
        m: castToSnapshot(S1Map.create({ one: T.create({}) })),
      })
    ),
    s2: S2.create(),
  };
  const rsCreate = RS.create(data, envObj);
  const rsCreate2 = clone(rsCreate, true);

  const rsSnap = RS.create(
    {
      s1: {
        arr: [{}],
        m: { one: {} },
      },
      s2: {},
    },
    envObj
  );
  const rsSnap2 = clone(rsCreate, true);

  check(rsCreate, 'using create', 'detach');
  check(rsSnap, 'using snapshot', 'detach');
  check(rsCreate2, 'using create', 'destroy');
  check(rsSnap2, 'using snapshot', 'destroy');

  const fails = logs.filter(l => l.startsWith('fail:'));

  if (fails.length > 0) {
    // eslint-disable-next-line jest/no-jasmine-globals
    fail(`\n${fails.join('\n')}`);
  }
});
