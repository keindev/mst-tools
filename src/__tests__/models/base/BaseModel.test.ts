import { toJS } from 'mobx';
import { flow } from 'mobx-state-tree';

import types from '../../../core/types';
import BaseModel from '../../../models/base/BaseModel';

describe('BaseModel', () => {
  const model = BaseModel.named('BaseModel')
    .props({
      stack: types.array(types.string),
    })
    .actions(self => ({
      firstAction: flow(function* () {
        const result = yield new Promise<string>(resolve => setTimeout(() => resolve('1'), 1000));

        self.stack.push('1');

        return result;
      }),
      secondAction() {
        const result = '2';

        self.stack.push('2');

        return result;
      },
      thirdAction: flow(function* () {
        const result = yield new Promise<string>(resolve => setTimeout(() => resolve('3')));

        self.stack.push('3');

        return result;
      }),
    }))
    .actions(({ pipe, firstAction, secondAction, thirdAction }) => ({
      executeActionsSync: () => pipe.sync([firstAction, secondAction, thirdAction]),
      executeActionsAsync: () => pipe.async([firstAction, secondAction, thirdAction]),
    }));

  it('Async pipe', async () => {
    const store = model.create({});
    const result = await store.executeActionsAsync();
    const stack = toJS(store.stack);

    expect(result).toStrictEqual(['1', '2', '3']);
    expect(stack).toStrictEqual(['2', '3', '1']);
  });

  it('Sync pipe', async () => {
    const store = model.create({});
    const result = await store.executeActionsSync();
    const stack = toJS(store.stack);

    expect(result).toStrictEqual(['1', '2', '3']);
    expect(stack).toStrictEqual(['1', '2', '3']);
  });
});
