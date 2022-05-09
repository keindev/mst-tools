import { types } from '../../index';
import {
    getMembers, getPropertyMembers, getType, IAnyModelType, IAnyStateTreeNode, IModelReflectionData,
    IModelReflectionPropertiesData,
} from '../../mst/index';

const User = types.model('User', {
  id: types.identifier,
  name: types.string,
});

const Model = types
  .model('', {
    isPerson: false,
    users: types.optional(types.map(User), {}),
    dogs: types.array(User),
    user: types.maybe(types.late(() => User)),
  })
  .volatile(() => ({
    volatileProperty: { propName: 'halo' },
  }))
  .actions(() => ({
    actionName() {
      return 1;
    },
  }))
  .views(() => ({
    get viewName() {
      return 1;
    },
  }));

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function expectPropertyMembersToMatchMembers(
  propertyMembers: IModelReflectionPropertiesData,
  members: IModelReflectionData
) {
  expect(propertyMembers).toEqual({
    name: members.name,
    properties: members.properties,
  });
}

it('reflection - model', () => {
  const node = Model.create();
  const reflection = getMembers(node);

  expect(reflection.name).toBe('AnonymousModel');
  expect(reflection.actions.includes('actionName')).toBe(true);
  expect(reflection.views.includes('viewName')).toBe(true);
  expect(reflection.volatile.includes('volatileProperty')).toBe(true);
  expect(!!reflection.properties.users).toBe(true);
  expect(!!reflection.properties.isPerson).toBe(true);

  const typeReflection = getPropertyMembers(Model);

  expectPropertyMembersToMatchMembers(typeReflection, reflection);

  const reflection2 = getPropertyMembers(node);

  expectPropertyMembersToMatchMembers(reflection2, reflection);
});

it('reflection - map', () => {
  const node = Model.create({
    users: { '1': { id: '1', name: 'Test' } },
  });
  const node2 = node.users.get('1')!;
  const reflection = getMembers(node2);

  expect(reflection.name).toBe('User');
  expect(!!reflection.properties.id).toBe(true);
  expect(!!reflection.properties.name).toBe(true);

  const typeReflection = getPropertyMembers(getType(node2) as IAnyModelType);

  expectPropertyMembersToMatchMembers(typeReflection, reflection);

  const reflection2 = getPropertyMembers(node2);

  expectPropertyMembersToMatchMembers(reflection2, reflection);
});
it('reflection - array', () => {
  const node = Model.create({
    dogs: [{ id: '1', name: 'Test' }],
  });
  const node2 = node.dogs[0]!;
  const reflection = getMembers(node2);

  expect(!!reflection.properties.id).toBe(true);
  expect(!!reflection.properties.name).toBe(true);

  const typeReflection = getPropertyMembers(getType(node2) as IAnyModelType);

  expectPropertyMembersToMatchMembers(typeReflection, reflection);

  const reflection2 = getPropertyMembers(node2);

  expectPropertyMembersToMatchMembers(reflection2, reflection);
});
it('reflection - late', () => {
  const node = Model.create({
    user: { id: '5', name: 'Test' },
  });
  const empty: IAnyStateTreeNode = {};
  const reflection = getMembers(node.user || empty);
  const keys = Object.keys(reflection.properties || {});

  expect(keys.includes('name')).toBe(true);
  expect(reflection.properties.name!.describe()).toBe('string');
});

it('reflection - throw on non model node for getMembers', () => {
  const node = Model.create({
    users: { '1': { id: '1', name: 'Test' } },
  });

  expect(() => (node.users ? getMembers(node.users) : {})).toThrowError();
});

it('reflection - throw on non model type/node for getMembers', () => {
  expect(() => getPropertyMembers(types.array(types.number) as any)).toThrowError();

  const node = Model.create({
    users: { '1': { id: '1', name: 'Test' } },
  });

  expect(() => getPropertyMembers(node.users)).toThrowError();
});
it('reflection - can retrieve property names', () => {
  const node = Model.create();
  const reflection = getMembers(node);
  const keys = Object.keys(reflection.properties);

  expect(keys.includes('users')).toBe(true);
  expect(keys.includes('isPerson')).toBe(true);
});

it('reflection - property contains type', () => {
  const TestModel = types.model('', {
    string: types.string,
    optional: false,
  });
  const node = TestModel.create({
    string: 'hello',
  });
  const reflection = getMembers(node);

  expect(reflection.properties.string).toBe(types.string);
  expect(reflection.properties.optional).toMatchObject(types.optional(types.boolean, false));
});

it('reflection - members chained', () => {
  const ChainedModel = types
    .model('', {
      isPerson: false,
    })
    .actions(() => ({
      actionName() {
        return 1;
      },
    }))
    .actions(() => ({
      anotherAction() {
        return 1;
      },
    }))
    .views(() => ({
      get viewName() {
        return 1;
      },
    }))
    .views(() => ({
      anotherView() {
        return 1;
      },
    }));
  const node = ChainedModel.create();
  const reflection = getMembers(node);
  const keys = Object.keys(reflection.properties || {});

  expect(keys.includes('isPerson')).toBe(true);
  expect(reflection.actions.includes('actionName')).toBe(true);
  expect(reflection.actions.includes('anotherAction')).toBe(true);
  expect(reflection.views.includes('viewName')).toBe(true);
  expect(reflection.views.includes('anotherView')).toBe(true);
});

it('reflection - conditionals respected', () => {
  let swap = true;
  const ConditionalModel = types
    .model('', {
      isPerson: false,
    })
    .actions(() => ({
      actionName0() {
        return 1;
      },
    }))
    .actions((): { actionName1(): number } | { actionName2(): number } => {
      if (swap) {
        return {
          actionName1() {
            return 1;
          },
        };
      }

      return {
        actionName2() {
          return 1;
        },
      };
    })
    .views(() => {
      if (swap) {
        return {
          get view1() {
            return 1;
          },
        };
      }

      return {
        get view2() {
          return 1;
        },
      };
    });
  // swap true
  const node = ConditionalModel.create();
  const reflection = getMembers(node);

  expect(reflection.actions.includes('actionName0')).toBe(true);
  expect(reflection.actions.includes('actionName1')).toBe(true);
  expect(reflection.actions.includes('actionName2')).toBe(false);
  expect(reflection.views.includes('view1')).toBe(true);
  expect(reflection.views.includes('view2')).toBe(false);
  swap = false;

  const node2 = ConditionalModel.create();
  const reflection2 = getMembers(node2);

  expect(reflection.actions.includes('actionName0')).toBe(true);
  expect(reflection2.actions.includes('actionName1')).toBe(false);
  expect(reflection2.actions.includes('actionName2')).toBe(true);
  expect(reflection2.views.includes('view1')).toBe(false);
  expect(reflection2.views.includes('view2')).toBe(true);
});
