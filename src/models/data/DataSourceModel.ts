import { flow, Instance, SnapshotIn, SnapshotOut } from 'mobx-state-tree';

import effect from '../../core/effect';
import types from '../../core/types';
import { fail } from '../../utils';
import BaseModel from '../base/BaseModel';

const DataSourceModel = BaseModel.named('DataSourceModel')
  .props({
    isInitializing: types.flag,
    isLoading: types.flag,
    isLoaded: types.flag,
  })
  .actions(() => ({
    _init: () => {
      throw fail('DataSourceModel initialization action (_init) for empty models must be overridden.');
    },
    _load: (..._params: unknown[]) => {
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
      function* (...params: unknown[]) {
        return yield self._load(...params);
      },
      { isLoading, isLoaded }
    ),
  }))
  .actions(self => ({
    load: flow(function* (...params: unknown[]) {
      if (!self.isInitialized) self.patch(yield self.__initEffect());
      if (!self.isEmpty) yield self.__loadEffect(...params);
    }),
  }))
  .actions(self => ({
    refresh: flow(function* (...params: unknown[]) {
      if (!self.isLoading) {
        self.isLoaded = false;
        yield self.pipe.sync([self._clear, self.load.bind(self, ...params)]);
      }
    }),
  }));

export interface IDataSourceModel extends Instance<typeof DataSourceModel> {}
export interface IDataSourceModelSnapshotIn extends SnapshotIn<IDataSourceModel> {}
export interface IDataSourceModelSnapshotOut extends SnapshotOut<IDataSourceModel> {}
export default DataSourceModel;
