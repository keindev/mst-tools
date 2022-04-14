import { flow } from 'mobx-state-tree';

import { EMPTY_VALUE } from '../../../constants';
import types from '../../../core/types';
import DataSourceModel from '../../../models/data/DataSourceModel';

describe('DataSourceModel', () => {
  it('Actions', async () => {
    const model = DataSourceModel.named('MyDataSourceModel')
      .props({
        id: types.empty(EMPTY_VALUE),
        a: types.optional(types.string, 'default'),
        b: types.optional(types.string, 'default'),
        c: types.optional(types.string, 'default'),
        d: types.optional(types.string, 'default'),
      })
      .actions(self => ({
        _init: flow(function* () {
          return yield Promise.resolve({ id: '0', b: 'initialized' });
        }),
        _load: flow(function* () {
          self.d = yield Promise.resolve('loaded');
        }),
        _clear() {
          self.c = 'cleared';
        },
      }));
    const store = model.create({});

    await store.refresh();

    expect(store.a).toBe('default');
    expect(store.b).toBe('initialized');
    expect(store.c).toBe('cleared');
    expect(store.d).toBe('loaded');
    expect(store.isInitialized).toBeTruthy();
    expect(store.isInitializing).toBeFalsy();
    expect(store.isLoaded).toBeTruthy();
    expect(store.isLoading).toBeFalsy();
  });
});
