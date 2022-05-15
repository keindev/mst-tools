import { types } from '../../index';
import { Instance } from '../../mst/core/state/Instance';
import { SnapshotIn } from '../../mst/core/state/Snapshot';
import {
    getIdentifier, IAnyComplexType, IAnyModelType, resolveIdentifier, resolvePath, tryResolve,
} from '../../mst/index';

it('Identifiers should check refinement', () => {
  const Model = types
    .model('Model', {
      id: types.refinement('id', types.string, identifier => identifier.indexOf('Model_') === 0),
    })
    .actions(self => ({
      setId(id: string) {
        self.id = id;
      },
    }));
  const ParentModel = types
    .model('ParentModel', {
      models: types.array(Model),
    })
    .actions(self => ({
      addModel(model: SnapshotIn<typeof Model> | Instance<typeof Model>) {
        self.models.push(model);
      },
    }));

  expect(() => {
    ParentModel.create({ models: [{ id: 'WrongId_1' }] });
  }).toThrow();
  expect(() => {
    const parentStore = ParentModel.create({ models: [] });

    parentStore.addModel({ id: 'WrongId_2' });
  }).toThrow();
  expect(() => {
    const model = Model.create({ id: 'Model_1' });

    model.setId('WrongId_3');
  }).toThrow();
  expect(() => {
    Model.create({ id: 'WrongId_4' });
  }).toThrow();
});

it('Identifiers should accept any string character', () => {
  const Todo = types.model('Todo', {
    id: types.identifier,
    title: types.string,
  });

  expect(() => {
    ['coffee', 'cof$fee', 'cof|fee', 'cof/fee'].forEach(id => {
      Todo.create({
        id,
        title: 'Get coffee',
      });
    });
  }).not.toThrow();
});

it('identifiers should not break late types', () => {
  expect(() => {
    const MstNode = types.model('MstNode', {
      value: types.number,
      next: types.maybe(types.late((): IAnyModelType => MstNode)),
    });
  }).not.toThrow();
});

it('should throw if multiple identifiers provided', () => {
  expect(() => {
    const Model = types.model('Model', {
      id: types.identifierNumber,
      pk: types.identifierNumber,
    });

    Model.create({ id: 1, pk: 2 });
  }).toThrowError(
    // eslint-disable-next-line max-len
    "[mobx-state-tree] Cannot define property 'pk' as object identifier, property 'id' is already defined as identifier property"
  );
});
it('should throw if identifier of wrong type', () => {
  expect(() => {
    const Model = types.model('Model', { id: types.identifier });

    Model.create({ id: 1 as any as string });
  }).toThrowError(
    // eslint-disable-next-line max-len
    'at path "/id" value `1` is not assignable to type: `identifier` (Value is not a valid identifier, expected a string).'
  );
});

it('identifier should be used only on model types - no parent provided', () => {
  expect(() => {
    const Model = types.identifierNumber;

    Model.create(1);
  }).toThrowError('[mobx-state-tree] Identifier types can only be instantiated as direct child of a model type');
});

{
  const Foo = types.model('Foo', {
    id: types.identifier,
    name: types.string,
  });

  const Bar = types.model('Bar', {
    mimi: types.string,
    fooRef: types.reference(Foo),
  });

  const Root = types.model('Root', {
    foos: types.map(Foo),
    bar: Bar,
  });

  const root = Root.create({
    foos: {},
    bar: {
      mimi: 'mimi',
      fooRef: '123',
    },
  });

  test("try resolve doesn't work #686", () => {
    expect(tryResolve(root, '/bar/fooRef')).toBe(undefined);

    expect(tryResolve(root, '/bar/fooRef/name')).toBe(undefined);
  });

  it('failing to resolve throws sane errors', () => {
    expect(() => {
      resolvePath(root, '/bar/mimi/oopsie');
    }).toThrow("[mobx-state-tree] Could not resolve 'oopsie' in path '/bar/mimi' while resolving '/bar/mimi/oopsie'");

    expect(() => {
      resolvePath(root, '/zoomba/moomba');
    }).toThrow("[mobx-state-tree] Could not resolve 'zoomba' in path '/' while resolving '/zoomba/moomba'");

    expect(() => resolvePath(root, '/bar/fooRef')).toThrow(
      "[mobx-state-tree] Failed to resolve reference '123' to type 'Foo' (from node: /bar/fooRef)"
    );
    expect(() => resolvePath(root, '/bar/fooRef/name')).toThrow(
      "[mobx-state-tree] Failed to resolve reference '123' to type 'Foo' (from node: /bar/fooRef)"
    );
  });
}

it('can resolve through refrences', () => {
  const Folder = types.model('Folder', {
    type: types.literal('folder'),
    name: types.identifier,
    children: types.array(types.late((): IAnyComplexType => types.union(Folder, SymLink))),
  });
  const SymLink = types.model('', {
    type: types.literal('link'),
    target: types.reference(Folder),
  });

  const root = Folder.create({
    type: 'folder',
    name: 'root',
    children: [
      {
        type: 'folder',
        name: 'a',
        children: [],
      },
      {
        type: 'folder',
        name: 'b',
        children: [
          {
            type: 'folder',
            name: 'c',
            children: [],
          },
        ],
      },
      {
        type: 'link',
        target: 'b',
      },
      {
        type: 'link',
        target: 'e',
      },
    ],
  });

  expect(resolvePath(root, '/children/1/children/0').name).toBe('c');

  expect(resolvePath(root, '/children/2/target/children/0').name).toBe('c');

  expect(resolvePath(root, '/children/2/target/children/../children/./0').name).toBe('c');

  expect(() => resolvePath(root, '/children/3/target/children/0').name).toThrow(
    "[mobx-state-tree] Failed to resolve reference 'e' to type 'Folder' (from node: /children/3/target)"
  );
});

it('#1019', () => {
  let calls = 0;

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function randomUuid() {
    calls++;

    const pattern = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

    return pattern.replace(/[xy]/g, cc => {
      const r = (Math.random() * 16) | 0,
        v = cc === 'x' ? r : (r & 0x3) | 0x8;

      return v.toString(16);
    });
  }

  const TOptionalId = types.optional(
    types.refinement(types.identifier, identifier =>
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(identifier)
    ),
    randomUuid
  );

  const CommentModel = types.model('CommentModel', {
    uid: TOptionalId,
  });

  const CommentStore = types
    .model('CommentStore', {
      items: types.array(CommentModel),
    })
    .actions(self => ({
      test1() {
        expect(calls).toBe(0);
        const comment = CommentModel.create({});

        expect(calls).toBe(1);

        self.items.push(comment);
        const item = resolveIdentifier(CommentModel, self.items, comment.uid);
        const item2 = self.items.find(i => i.uid === comment.uid);

        expect(item).toBe(item2);
      },
    }));

  const c = CommentStore.create({});

  c.test1();
});

it('#1019-2', () => {
  const Item = types.model('', {
    id: types.optional(types.identifier, 'dummykey'),
  });

  expect(getIdentifier(Item.create())).toBe('dummykey');
  expect(Item.create().id).toBe('dummykey');
});

it('identifierAttribute of the type', () => {
  const M1 = types.model('', {});

  expect(M1.identifierAttribute).toBe(undefined);

  const M2 = types.model('', { myId: types.identifier });

  expect(M2.identifierAttribute).toBe('myId');

  const M3 = types.model('', { myId: types.optional(types.identifier, () => 'hi') });

  expect(M3.identifierAttribute).toBe('myId');
});
