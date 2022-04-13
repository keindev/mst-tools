import { flow } from 'mobx-state-tree';

import BaseModel from '../../../models/base/BaseModel';

describe('BaseModel', () => {
  const model = BaseModel.named('BaseModel')
    .actions(() => ({
      firstAction: flow(function* () {
        return yield new Promise<string>(resolve => setTimeout(() => resolve('1'), 1000));
      }),
      secondAction() {
        return '2';
      },
      thirdAction: flow(function* () {
        return yield new Promise<string>(resolve => setTimeout(() => resolve('3')));
      }),
    }))
    .actions(({ pipe, firstAction, secondAction, thirdAction }) => ({
      executeActionsSync: () => pipe.sync([firstAction, secondAction, thirdAction]),
      executeActionsAsync: () => pipe.async([firstAction, secondAction, thirdAction]),
    }));

  it('Async pipe', async () => {
    const store = model.create({});
    const result = await store.executeActionsAsync();

    expect(result).toStrictEqual(['1', '2', '3']);
  });

  it('Sync pipe', async () => {
    const store = model.create({});
    const result = await store.executeActionsSync();

    expect(result).toStrictEqual(['1', '2', '3']);
  });
});
