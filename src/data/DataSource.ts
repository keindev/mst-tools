/*
import { applySnapshot, flow, getSnapshot, IAnyModelType, Instance, SnapshotIn, types } from 'mobx-state-tree';

import { EMPTY_ID } from '../../types/globals';
import RequestModel from '../api/Request';

const DataSourceModel = RequestModel.named('DataSourceModel')
  .props({
    isLoading: types.optional(types.boolean, false),
    isLoaded: types.optional(types.boolean, false),
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
        if (!self.isLoaded && !self.isLoading) {
          try {
            self._startLoading();
            yield self._load(...(params as unknown[]));
          } finally {
            self._endLoading();
          }
        }
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
