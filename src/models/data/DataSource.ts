/*
import { applySnapshot, flow, getSnapshot, IAnyModelType, Instance, SnapshotIn } from 'mobx-state-tree';

import types from '../../core/types';
import BaseModel from '../base/BaseModel';

const DataSourceModel = BaseModel.named('DataSourceModel')
  .props({
    isLoading: types.flag,
    isLoaded: types.flag,
  })
  .views(self => ({
    get isEmpty(): boolean {
      return self.id === EMPTY_ID;
    },
    get isInitialized(): boolean {
      return !this.isEmpty;
    },
  }))
  .actions(self => ({
    _startLoading(): void {
      self.isLoading = true;
      self.isLoaded = false;
    },
    _endLoading(): void {
      self.isLoading = false;
      self.isLoaded = true;
    },
    _initialize: (_id: string) => Promise.resolve(),
    _load: (..._params: any[]) => Promise.resolve(),
    _clear() {
      // Empty
    },
  }))
  .actions(self => ({
    load: flow(function* (...params: any[]) {
      if (!self.isEmpty) {
        if (!self.isInitialized) applySnapshot(self, yield self._initialize(self.id));
        // ---------------------------------------------
        if (!self.isLoaded && !self.isLoading) {
          try {
            self._startLoading();
            yield self._load(...(params as unknown[]));
          } finally {
            self._endLoading();
          }
        }
        // ---------------------------------------------
      }
    }),
    apply(snapshot: SnapshotIn<IAnyModelType>) {
      applySnapshot(self, { ...getSnapshot(self), ...snapshot });
    },
  }))
  .actions(self => ({
    refresh: flow(function* (...params: any[]) {
      if (!self.isLoading) {
        self.isLoaded = false;
        self._clear();

        yield self.load(...(params as unknown[]));
      }
    }),
  }));

export interface IDataSourceModel extends Instance<typeof DataSourceModel> {}
export default DataSourceModel;
*/
