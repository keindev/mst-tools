import { Instance } from 'mobx-state-tree';

import { types } from '../../index';

describe('Core contexts', () => {
  it('Create models hierarchy with context', () => {
    const { AName, AContext, AContextWrapper } = types.context('A', (_, context) => ({
      get parentA_field(): string | undefined {
        return context<Instance<typeof A>>()?.field;
      },
    }));

    const { BName, BContext, BContextWrapper } = types.context('B', (_, context) => ({
      get parentB_field(): string | undefined {
        return context<Instance<typeof B>>()?.field;
      },
    }));

    const result: (string | undefined)[] = [];
    const C = types
      .compose(AContext, BContext)
      .named(BName)
      .props({ field: types.empty('C') })
      .actions(self => ({
        action() {
          result.push(self.parentA_field, self.parentB_field);
        },
      }));
    const B = BContextWrapper.named(BName).props({ field: types.empty('B'), leaf: types.reserve(C) });
    const A = AContextWrapper.named(AName).props({ field: types.empty('A'), node: types.reserve(B) });
    const store = A.create({});

    store.node.leaf.action();

    expect(result).toStrictEqual(['A', 'B']);
  });
});
