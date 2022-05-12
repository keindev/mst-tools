import { types } from '../../index';
import { getEnv, getParent, getPath, Instance } from '../../mst/index';

const ChildModel = types
  .model('Child', {
    parentPropertyIsNullAfterCreate: false,
    parentEnvIsNullAfterCreate: false,
    parentPropertyIsNullAfterAttach: false,
  })
  .views(self => ({
    get parent(): IParentModelInstance {
      return getParent<typeof ParentModel>(self);
    },
  }))
  .actions(self => ({
    afterCreate() {
      self.parentPropertyIsNullAfterCreate = typeof self.parent.fetch === 'undefined';
      self.parentEnvIsNullAfterCreate = typeof getEnv(self.parent).fetch === 'undefined';
    },
    afterAttach() {
      self.parentPropertyIsNullAfterAttach = typeof self.parent.fetch === 'undefined';
    },
  }));

const ParentModel = types
  .model('Parent', {
    child: types.optional(ChildModel, {}),
  })
  .views(self => ({
    get fetch() {
      return getEnv(self).fetch;
    },
  }));

interface IParentModelInstance extends Instance<typeof ParentModel> {}

// NOTE: parents are now always created before children;
// moreover, we do not actually have actions hash during ObjectNode creation
test("Parent property have value during child's afterCreate() event", () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const mockFetcher = () => Promise.resolve(true);
  const parent = ParentModel.create({}, { fetch: mockFetcher });

  // Because the child is created before the parent creation is finished, this one will yield `true` (the .fetch view is still undefined)
  expect(parent.child.parentPropertyIsNullAfterCreate).toBe(false);
  // ... but, the env is available
  expect(parent.child.parentEnvIsNullAfterCreate).toBe(false);
});
test("Parent property has value during child's afterAttach() event", () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const mockFetcher = () => Promise.resolve(true);
  const parent = ParentModel.create({}, { fetch: mockFetcher });

  expect(parent.child.parentPropertyIsNullAfterAttach).toBe(false);
});

it('#917', () => {
  const SubTodo = types
    .model('SubTodo', {
      id: types.optional(types.number, () => Math.random()),
      title: types.string,
      finished: false,
    })
    .views(self => ({
      get path() {
        return getPath(self);
      },
    }))
    .actions(self => ({
      toggle() {
        self.finished = !self.finished;
      },
    }));

  const Todo = types
    .model('Todo', {
      id: types.optional(types.number, () => Math.random()),
      title: types.string,
      finished: false,
      subtodoList: types.array(SubTodo),
    })
    .views(self => ({
      get path() {
        return getPath(self);
      },
    }))
    .actions(self => ({
      toggle() {
        self.finished = !self.finished;
      },
    }));

  const todoListtore = types
    .model('todoListtore', {
      todoList: types.array(Todo),
    })
    .views(self => ({
      get unfinishedTodoCount() {
        return self.todoList.filter(todo => !todo.finished).length;
      },
    }))
    .actions(self => ({
      addTodo(title: string) {
        self.todoList.push({
          title,
          subtodoList: [
            {
              title,
            },
          ],
        });
      },
    }));

  const store2 = todoListtore.create({
    todoList: [
      Todo.create({
        title: 'get Coffee',
        subtodoList: [
          SubTodo.create({
            title: 'test',
          }),
        ],
      }),
    ],
  });

  expect(store2.todoList[0]!.path).toBe('/todoList/0');
  expect(store2.todoList[0]!.subtodoList[0]!.path).toBe('/todoList/0/subtodoList/0');
});
