import { types } from '../../index';
import { IAnyModelType, typecheck } from '../../mst/index';

it('should throw if late doesnt received a function as parameter', () => {
  expect(() => {
    types.model('', {
      after: types.late(1 as any),
    });
  }).toThrow();
});

it('should accept a type and infer it correctly', () => {
  const Before = types.model('', {
    after: types.late(() => After),
  });
  const After = types.model('', {
    name: types.maybe(types.string),
  });

  expect(() => Before.create({ after: { name: "Hello, it's me." } })).not.toThrow();
});

it('late should allow circular references', () => {
  // TypeScript is'nt smart enough to infer self referencing types.
  const Node = types.model('', {
    childs: types.optional(types.array(types.late((): IAnyModelType => Node)), []),
  });

  expect(() => Node.create()).not.toThrow();
  expect(() => Node.create({ childs: [{}, { childs: [] }] })).not.toThrow();
});

it('late should describe correctly circular references', () => {
  // TypeScript is'nt smart enough to infer self referencing types.
  const Node = types.model('Node', {
    childs: types.array(types.late((): IAnyModelType => Node)),
  });

  expect(Node.describe()).toEqual('{ childs: Node[]? }');
});

it('should typecheck', () => {
  const NodeObject = types.model('NodeObject', {
    id: types.identifierNumber,
    text: 'Hi',
    child: types.maybe(types.late((): IAnyModelType => NodeObject)),
  });
  const x = NodeObject.create({ id: 1 });

  expect(() => {
    (x as any).child = 3;
  }).toThrow();

  expect(() => {
    (x as any).floepie = 3;
  }).toThrow();

  expect(x.child).not.toBeDefined();
  expect((x as any).floepie).not.toBeDefined();
});

it('typecheck should throw an Error when called at runtime, but not log the error', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  const NodeObject = types.model('NodeObject', {
    id: types.identifierNumber,
    text: types.string,
  });

  expect(() => {
    typecheck(NodeObject, { id: 1, text: 1 } as any);
  }).toThrow();
  expect(consoleSpy).not.toHaveBeenCalled();
});

it('late type checking', () => {
  const Product = types.model('', {
    details: types.late(() => types.optional(Details, {})),
  });

  const Details = types.model('', {
    name: types.maybe(types.string),
  });

  let p;
  let p2;

  try {
    p2 = Product.create({});
    p = Product.create({ details: { name: 'bla' } });
  } finally {
    expect(p2).toBeDefined();
    expect(p).toBeDefined();
  }
});

it('#916 - 0', () => {
  const Todo = types.model('Todo', {
    title: types.string,
    newTodo: types.optional(
      types.late((): IAnyModelType => Todo),
      {}
    ), // N.B. this definition is never instantiateable!
  });

  expect(Todo).toBeDefined();
});

it('#916 - 1', () => {
  const Todo = types.model('Todo', {
    title: types.string,
    newTodo: types.maybe(types.late((): IAnyModelType => Todo)),
  });
  const t = Todo.create({
    title: 'Get Coffee',
  });

  expect(Todo).toBeDefined();
  expect(t).toBeDefined();
});

it('#916 - 2', () => {
  const Todo = types.model('Todo', {
    title: types.string,
    newTodo: types.maybe(types.late((): IAnyModelType => Todo)),
  });

  expect(
    Todo.is({
      title: 'A',
      newTodo: { title: ' test' },
    })
  ).toBe(true);
  expect(
    Todo.is({
      title: 'A',
      newTodo: { title: 7 },
    })
  ).toBe(false);
});

it('#916 - 3', () => {
  const Todo = types.model('Todo', {
    title: types.string,
    newTodo: types.maybe(types.late((): IAnyModelType => Todo)),
  });
  const t = Todo.create({
    title: 'Get Coffee',
    newTodo: { title: 'test' },
  });

  expect(t.newTodo!.title).toBe('test');
});
