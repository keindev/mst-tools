import { configure } from 'mobx';

import { types } from '../../index';
import { castToReferenceSnapshot, IAnyModelType, unprotect } from '../../mst/index';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function Pointer<IT extends IAnyModelType>(Model: IT) {
  return types.model('PointerOf' + Model.name, {
    value: types.maybe(types.reference(Model)),
  });
}

const Todo = types.model('Todo', {
  id: types.identifier,
  name: types.string,
});

it('should allow array of pointer objects', () => {
  configure({
    enforceActions: 'never',
  });

  const TodoPointer = Pointer(Todo);
  const AppStore = types.model('AppStore', {
    todoList: types.array(Todo),
    selected: types.optional(types.array(TodoPointer), []),
  });
  const store = AppStore.create({
    todoList: [
      { id: '1', name: 'Hello' },
      { id: '2', name: 'World' },
    ],
    selected: [],
  });

  unprotect(store);

  const ref = TodoPointer.create({ value: castToReferenceSnapshot(store.todoList[0]) }); // Fails because store.todoList does not belongs to the same tree

  store.selected.push(ref);
  expect(store.selected[0]!.value).toBe(store.todoList[0]);
});

it('should allow array of pointer objects - 2', () => {
  configure({
    enforceActions: 'never',
  });

  const TodoPointer = Pointer(Todo);
  const AppStore = types.model('', {
    todoList: types.array(Todo),
    selected: types.optional(types.array(TodoPointer), []),
  });
  const store = AppStore.create({
    todoList: [
      { id: '1', name: 'Hello' },
      { id: '2', name: 'World' },
    ],
    selected: [],
  });

  unprotect(store);

  const ref = TodoPointer.create();

  store.selected.push(ref);
  ref.value = store.todoList[0]!;

  expect(store.selected[0]!.value).toBe(store.todoList[0]);
});

it('should allow array of pointer objects - 3', () => {
  configure({
    enforceActions: 'never',
  });

  const TodoPointer = Pointer(Todo);
  const AppStore = types.model('', {
    todoList: types.array(Todo),
    selected: types.optional(types.array(TodoPointer), []),
  });
  const store = AppStore.create({
    todoList: [
      { id: '1', name: 'Hello' },
      { id: '2', name: 'World' },
    ],
    selected: [],
  });

  unprotect(store);

  const ref = TodoPointer.create({ value: castToReferenceSnapshot(store.todoList[0]) });

  store.selected.push(ref);

  expect(store.selected[0]!.value).toBe(store.todoList[0]);
});

it('should allow array of pointer objects - 4', () => {
  configure({
    enforceActions: 'never',
  });

  const TodoPointer = Pointer(Todo);
  const AppStore = types.model('', {
    todoList: types.array(Todo),
    selected: types.optional(types.array(TodoPointer), []),
  });
  const store = AppStore.create({
    todoList: [
      { id: '1', name: 'Hello' },
      { id: '2', name: 'World' },
    ],
    selected: [],
  });

  unprotect(store);

  const ref = TodoPointer.create(); // Fails because ref is required

  store.selected.push(ref);

  ref.value = store.todoList[0]!;

  expect(ref.value).toBe(store.todoList[0]);
});
