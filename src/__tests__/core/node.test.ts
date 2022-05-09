import { autorun, configure } from 'mobx';

import { types } from '../../index';
import {
    clone, destroy, detach, getChildType, getIdentifier, getNodeId, getParent, getParentOfType, getPath, getPathParts,
    getRoot, getSnapshot, getType, hasParent, hasParentOfType, isAlive, recordActions, recordPatches, unprotect,
} from '../../mst/index';

// getParent
it('should resolve to the parent instance', () => {
  configure({
    enforceActions: 'never',
  });

  const Row = types.model('', {
    article_id: 0,
  });
  const Document = types.model('', {
    rows: types.optional(types.array(Row), []),
  });
  const doc = Document.create();

  unprotect(doc);

  const row = Row.create();

  doc.rows.push(row);
  expect(getParent(row)).toEqual(doc.rows);
});

// hasParent
it('should check for parent instance', () => {
  const Row = types.model('', {
    article_id: 0,
  });
  const Document = types.model('', {
    rows: types.optional(types.array(Row), []),
  });
  const doc = Document.create();

  unprotect(doc);

  const row = Row.create();

  doc.rows.push(row);
  expect(hasParent(row)).toEqual(true);
});

it('should check for parent instance (unbound)', () => {
  const Row = types.model('', {
    article_id: 0,
  });
  const row = Row.create();

  expect(hasParent(row)).toEqual(false);
});
// getParentOfType
it('should resolve to the given parent instance', () => {
  configure({
    useProxies: 'never',
  });

  const Cell = types.model('', {});
  const Row = types.model('', {
    cells: types.optional(types.array(Cell), []),
  });
  const Document = types.model('', {
    rows: types.optional(types.array(Row), []),
  });
  const doc = Document.create({
    rows: [
      {
        cells: [{}],
      },
    ],
  });

  expect(getParentOfType(doc.rows[0]!.cells[0], Document)).toEqual(doc);
});

it('should throw if there is not parent of type', () => {
  const Cell = types.model('', {});
  const Row = types.model('', {
    cells: types.optional(types.array(Cell), []),
  });
  const Document = types.model('', {
    rows: types.optional(types.array(Row), []),
  });
  const row = Row.create({
    cells: [{}],
  });

  expect(() => getParentOfType(row.cells[0], Document)).toThrowError(
    '[mobx-state-tree] Failed to find the parent of AnonymousModel@/cells/0 of a given type'
  );
});

// hasParentOfType
it('should check for parent instance of given type', () => {
  const Cell = types.model('', {});
  const Row = types.model('', {
    cells: types.optional(types.array(Cell), []),
  });
  const Document = types.model('', {
    rows: types.optional(types.array(Row), []),
  });
  const doc = Document.create({
    rows: [
      {
        cells: [{}],
      },
    ],
  });

  expect(hasParentOfType(doc.rows[0]!.cells[0], Document)).toEqual(true);
});

it('should check for parent instance of given type (unbound)', () => {
  const Cell = types.model('', {});
  const Row = types.model('', {
    cells: types.optional(types.array(Cell), []),
  });
  const Document = types.model('', {
    rows: types.optional(types.array(Row), []),
  });
  const row = Row.create({
    cells: [{}],
  });

  expect(hasParentOfType(row.cells[0], Document)).toEqual(false);
});

// getRoot
it('should resolve to the root of an object', () => {
  const Row = types.model('Row', {
    article_id: 0,
  });
  const Document = types.model('Document', {
    rows: types.optional(types.array(Row), []),
  });
  const doc = Document.create();

  unprotect(doc);

  const row = Row.create();

  doc.rows.push(row);
  expect(getRoot(row)).toBe(doc);
});

// getIdentifier
it('should resolve to the identifier of the object', () => {
  const Document = types.model('Document', {
    id: types.identifier,
  });
  const doc = Document.create({
    id: 'document_1',
  });

  // get identifier of object
  expect(getIdentifier(doc)).toBe('document_1');
});

// getPath
it('should resolve the path of an object', () => {
  configure({
    enforceActions: 'never',
  });

  const Row = types.model('', {
    article_id: 0,
  });
  const Document = types.model('', {
    rows: types.optional(types.array(Row), []),
  });
  const doc = Document.create();

  unprotect(doc);

  const row = Row.create();

  doc.rows.push(row);
  expect(getPath(row)).toEqual('/rows/0');
  expect(getPathParts(row)).toEqual(['rows', '0']);
});

it('should resolve parents', () => {
  const Row = types.model('', {
    article_id: 0,
  });
  const Document = types.model('', {
    rows: types.optional(types.array(Row), []),
  });
  const doc = Document.create();

  unprotect(doc);

  const row = Row.create();

  doc.rows.push(row);
  expect(hasParent(row)).toBe(true); // array
  expect(hasParent(row, 2)).toBe(true); // row
  expect(hasParent(row, 3)).toBe(false);
  expect(getParent(row) === doc.rows).toBe(true); // array
  expect(getParent(row, 2) === doc).toBe(true); // row
  expect(() => getParent(row, 3)).toThrowError(
    '[mobx-state-tree] Failed to find the parent of AnonymousModel@/rows/0 at depth 3'
  );
});

// clone
it('should clone a node', () => {
  configure({
    useProxies: 'never',
  });

  const Row = types.model('', {
    article_id: 0,
  });
  const Document = types.model('', {
    rows: types.optional(types.array(Row), []),
  });
  const doc = Document.create();

  unprotect(doc);

  const row = Row.create();

  doc.rows.push(row);

  const cloned = clone(doc);

  expect(doc).toEqual(cloned);
  expect(getSnapshot(doc)).toEqual(getSnapshot(cloned));
});
it('should be possible to clone a dead object', () => {
  configure({
    useProxies: 'never',
    enforceActions: 'never',
  });

  const Task = types.model('Task', {
    x: types.string,
  });
  const a = Task.create({ x: 'a' });
  const store = types
    .model('', {
      todoList: types.optional(types.array(Task), []),
    })
    .create({
      todoList: [a],
    });

  unprotect(store);
  expect(store.todoList.slice()).toEqual([a]);
  expect(isAlive(a)).toBe(true);
  store.todoList.splice(0, 1);
  expect(isAlive(a)).toBe(false);

  const a2 = clone(a);

  store.todoList.splice(0, 0, a2);
  expect(store.todoList[0]!.x).toBe('a');
});

// getModelFactory
it('should return the model factory', () => {
  const Document = types.model('', {
    customer_id: 0,
  });
  const doc = Document.create();

  expect(getType(doc)).toEqual(Document);
});

// getChildModelFactory
it('should return the child model factory', () => {
  const Row = types.model('', {
    article_id: 0,
  });
  const ArrayOfRow = types.optional(types.array(Row), []);
  const Document = types.model('', {
    rows: ArrayOfRow,
  });
  const doc = Document.create();

  expect(getChildType(doc, 'rows')).toEqual(ArrayOfRow);
});

it('a node can exists only once in a tree', () => {
  configure({
    enforceActions: 'never',
  });

  const Row = types.model('', {
    article_id: 0,
  });
  const Document = types.model('', {
    rows: types.optional(types.array(Row), []),
    foos: types.optional(types.array(Row), []),
  });
  const doc = Document.create();

  unprotect(doc);

  const row = Row.create();

  doc.rows.push(row);
  expect(() => {
    doc.foos.push(row);
  }).toThrow(
    // eslint-disable-next-line max-len
    "[mobx-state-tree] Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '/foos/0', but it lives already at '/rows/0'"
  );
});

it('make sure array filter works properly', () => {
  configure({
    enforceActions: 'never',
  });

  const Row = types.model('', {
    done: false,
  });
  const Document = types
    .model('', {
      rows: types.optional(types.array(Row), []),
    })
    .actions(self => ({
      clearDone() {
        self.rows.filter(row => row.done === true).forEach(destroy);
      },
    }));
  const doc = Document.create();

  unprotect(doc);

  const a = Row.create({ done: true });
  const b = Row.create({ done: false });

  doc.rows.push(a);
  doc.rows.push(b);
  doc.clearDone();
  expect(getSnapshot(doc)).toEqual({ rows: [{ done: false }] });
});

// === RECORD PATCHES ===
it('can record and replay patches', () => {
  configure({
    enforceActions: 'never',
  });

  const Row = types.model('', {
    article_id: 0,
  });
  const Document = types.model('', {
    customer_id: 0,
    rows: types.optional(types.array(Row), []),
  });
  const source = Document.create();

  unprotect(source);

  const target = Document.create();
  const recorder = recordPatches(source);

  source.customer_id = 1;
  source.rows.push(Row.create({ article_id: 1 }));
  recorder.replay(target);
  expect(getSnapshot(source)).toEqual(getSnapshot(target));
});

// === RECORD ACTIONS ===
it('can record and replay actions', () => {
  const Row = types
    .model('', {
      article_id: 0,
    })
    .actions(self => ({
      setArticle(article_id: number) {
        self.article_id = article_id;
      },
    }));
  const Document = types
    .model('', {
      customer_id: 0,
      rows: types.optional(types.array(Row), []),
    })
    .actions(self => ({
      setCustomer(customer_id: number) {
        self.customer_id = customer_id;
      },
      addRow() {
        self.rows.push(Row.create());
      },
    }));
  const source = Document.create();
  const target = Document.create();
  const recorder = recordActions(source);

  source.setCustomer(1);
  source.addRow();
  source.rows[0]!.setArticle(1);
  recorder.replay(target);
  expect(getSnapshot(source)).toEqual(getSnapshot(target));
});

it('Liveliness issue #683', () => {
  const User = types.model('', { id: types.identifierNumber, name: types.string });

  const Users = types
    .model('', {
      list: types.map(User),
    })
    .actions(self => ({
      put(aUser: typeof User.CreationType | typeof User.Type) {
        // if (self.has(user.id)) detach(self.get(user.id));
        self.list.put(aUser);
      },
      get(id: string) {
        return self.list.get(id);
      },
      has(id: string) {
        return self.list.has(id);
      },
    }));

  const users = Users.create({
    list: {
      1: { name: 'Name', id: 1 },
    },
  });
  const user = users.get('1');

  expect(user!.name).toBe('Name');

  users.put({ id: 1, name: 'NameX' });
  expect(user!.name).toBe('NameX');
  expect(users.get('1')!.name).toBe('NameX');
});

it('triggers on changing paths - 1', () => {
  const Todo = types.model('', {
    title: types.string,
  });
  const App = types
    .model('', {
      todoList: types.array(Todo),
    })
    .actions(() => ({
      do(fn: () => void) {
        fn();
      },
    }));

  const t1 = Todo.create({ title: 't1 ' });
  const t2 = Todo.create({ title: 't2 ' });

  const app = App.create({
    todoList: [t1],
  });

  const events: string[] = [];

  autorun(() => {
    events.push('t1@' + getPath(t1));
  });
  autorun(() => {
    events.push('t2@' + getPath(t2));
  });

  expect(events.splice(0)).toEqual(['t1@/todoList/0', 't2@']);
  app.do(() => {
    app.todoList.unshift(t2);
  });
  expect(events.splice(0)).toEqual(['t2@/todoList/0', 't1@/todoList/1']);
  app.do(() => {
    detach(t2);
  });
  expect(events.splice(0)).toEqual(['t1@/todoList/0', 't2@']);

  app.do(() => {
    app.todoList.splice(0);
  });
  expect(events.splice(0)).toEqual(['t1@']);
});

it('getNodeId works', () => {
  const M = types.model('', {});
  const m1 = M.create();
  const m2 = M.create();
  const m1Id = getNodeId(m1);
  const m2Id = getNodeId(m2);

  expect(m1Id).toBeGreaterThan(0);
  expect(m2Id).toBe(m1Id + 1);
});
