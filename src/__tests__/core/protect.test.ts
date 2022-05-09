import { configure } from 'mobx';

import { types } from '../../index';
import { applySnapshot, getParent, isProtected, protect, unprotect } from '../../mst/index';

const Todo = types
  .model('Todo', {
    title: '',
  })
  .actions(self => ({
    setTitle(newTitle: string) {
      self.title = newTitle;
    },
  }));
const Store = types.model('Store', {
  todoList: types.array(Todo),
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createTestStore() {
  return Store.create({
    todoList: [{ title: 'Get coffee' }, { title: 'Get biscuit' }],
  });
}
it('should be possible to protect an object', () => {
  configure({
    enforceActions: 'never',
  });

  const store = createTestStore();

  unprotect(store);
  store.todoList[1]!.title = 'A';
  protect(store);
  expect(() => {
    store.todoList[0]!.title = 'B';
  }).toThrowError(
    // eslint-disable-next-line max-len
    "[mobx-state-tree] Cannot modify 'Todo@/todoList/0', the object is protected and can only be modified by using an action."
  );
  expect(store.todoList[1]!.title).toBe('A');
  expect(store.todoList[0]!.title).toBe('Get coffee');
  store.todoList[0]!.setTitle('B');
  expect(store.todoList[0]!.title).toBe('B');
});

it('protect should protect against any update', () => {
  configure({
    enforceActions: 'never',
  });

  const store = createTestStore();

  expect(
    // apply Snapshot / patch are currently allowed, even outside protected mode
    () => {
      applySnapshot(store, { todoList: [{ title: 'Get tea' }] });
    }
  ).not.toThrowError(
    // eslint-disable-next-line max-len
    "[mobx-state-tree] Cannot modify 'Todo@<root>', the object is protected and can only be modified by using an action."
  );
  expect(() => {
    store.todoList.push({ title: 'test' });
  }).toThrowError(
    // eslint-disable-next-line max-len
    "[mobx-state-tree] Cannot modify 'Todo[]@/todoList', the object is protected and can only be modified by using an action."
  );
  expect(() => {
    store.todoList[0]!.title = 'test';
  }).toThrowError(
    // eslint-disable-next-line max-len
    "[mobx-state-tree] Cannot modify 'Todo@/todoList/0', the object is protected and can only be modified by using an action."
  );
});

it('protect should also protect children', () => {
  const store = createTestStore();

  expect(() => {
    store.todoList[0]!.title = 'B';
  }).toThrowError(
    // eslint-disable-next-line max-len
    "[mobx-state-tree] Cannot modify 'Todo@/todoList/0', the object is protected and can only be modified by using an action."
  );
  store.todoList[0]!.setTitle('B');
  expect(store.todoList[0]!.title).toBe('B');
});

it('unprotected mode should be lost when attaching children', () => {
  configure({
    enforceActions: 'never',
  });

  const store = Store.create({ todoList: [] });
  const t1 = Todo.create({ title: 'hello' });

  unprotect(t1);
  expect(isProtected(t1)).toBe(false);
  expect(isProtected(store)).toBe(true);
  t1.title = 'world'; // ok
  unprotect(store);
  store.todoList.push(t1);
  protect(store);
  expect(isProtected(t1)).toBe(true);
  expect(isProtected(store)).toBe(true);
  expect(() => {
    t1.title = 'B';
  }).toThrowError(
    // eslint-disable-next-line max-len
    "[mobx-state-tree] Cannot modify 'Todo@/todoList/0', the object is protected and can only be modified by using an action."
  );
  store.todoList[0]!.setTitle('C');
  expect(store.todoList[0]!.title).toBe('C');
});

it('protected mode should be inherited when attaching children', () => {
  configure({
    enforceActions: 'never',
  });

  const store = Store.create({ todoList: [] });

  unprotect(store);

  const t1 = Todo.create({ title: 'hello' });

  expect(isProtected(t1)).toBe(true);
  expect(isProtected(store)).toBe(false);
  expect(() => {
    t1.title = 'B';
  }).toThrowError(
    // eslint-disable-next-line max-len
    "[mobx-state-tree] Cannot modify 'Todo@<root>', the object is protected and can only be modified by using an action."
  );
  store.todoList.push(t1);
  t1.title = 'world'; // ok, now unprotected
  expect(isProtected(t1)).toBe(false);
  expect(isProtected(store)).toBe(false);
  expect(store.todoList[0]!.title).toBe('world');
});

it('action cannot modify parent', () => {
  const Child = types
    .model('Child', {
      x: 2,
    })
    .actions(self => ({
      setParentX() {
        getParent<typeof self>(self).x += 1;
      },
    }));
  const Parent = types.model('Parent', {
    x: 3,
    child: Child,
  });
  const p = Parent.create({ child: {} });

  expect(() => p.child.setParentX()).toThrowError(
    // eslint-disable-next-line max-len
    "[mobx-state-tree] Cannot modify 'Parent@<root>', the object is protected and can only be modified by using an action."
  );
});
