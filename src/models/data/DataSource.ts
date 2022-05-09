import effect from '../../core/effect';
import { types } from '../../core/types';
import { flow, Instance } from '../../mst/index';
import { fail } from '../../utils';
import { BaseModel } from '../base/Base';

export const DataSourceModel = BaseModel.named('DataSourceModel')
  .props({
    isInitializing: types.flag,
    isLoading: types.flag,
    isLoaded: types.flag,
  })
  .actions(() => ({
    _init: () => {
      throw fail('DataSourceModel initialization action (_init) for empty models must be overridden.');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _load: (..._params: any[]) => {
      throw fail();
    },
    _clear() {
      // Empty
    },
  }))
  .effects((self, { isInitializing, isLoading, isLoaded }) => ({
    __initEffect: effect(
      function* () {
        return yield self._init();
      },
      { isInitializing }
    ),
    __loadEffect: effect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function* (...params: any[]) {
        return yield self._load(...params);
      },
      { isLoading, isLoaded }
    ),
  }))
  .actions(self => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    load: flow(function* (...params: any[]) {
      if (!self.isInitialized) self.patch(yield self.__initEffect());
      if (!self.isEmpty) yield self.__loadEffect(...params);
    }),
  }))
  .actions(self => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    refresh: flow(function* (...params: any[]) {
      if (!self.isLoading) {
        self.isLoaded = false;
        yield self.pipe.sync([self._clear, self.load.bind(self, ...params)]);
      }
    }),
  }));

export interface IDataSourceModel extends Instance<typeof DataSourceModel> {}
