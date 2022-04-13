import { applySnapshot, getSnapshot, Instance, SnapshotIn, SnapshotOut } from 'mobx-state-tree';

import { EMPTY_VALUE } from '../../constants';
import types from '../../core/types';
import { IFunction } from '../../types';

const process = async (functions: (IFunction | undefined)[], parallel = true): Promise<unknown[]> => {
  const promises = functions.map(fn => fn && fn());
  let result = [];

  if (parallel) result = await Promise.all(promises);
  else for (const promise of promises) result.push(promise instanceof Promise ? await promise : promise);

  return result;
};

const BaseModel = types
  .model('BaseModel', {
    id: types.uid,
  })
  .volatile(() => ({
    pipe: {
      async: (functions: (IFunction | undefined)[]) => process(functions),
      sync: (functions: (IFunction | undefined)[]) => process(functions, false),
    },
  }))
  .views(self => ({
    get isEmpty(): boolean {
      return self.id === EMPTY_VALUE;
    },
    get isInitialized(): boolean {
      return !this.isEmpty;
    },
  }))
  .actions(self => ({
    patch(snapshot: Partial<SnapshotIn<Instance<typeof self>>>) {
      applySnapshot(self, { ...getSnapshot(self), ...snapshot });
    },
  }));

export interface IBaseModel extends Instance<typeof BaseModel> {}
export interface IBaseModelSnapshotIn extends SnapshotIn<IBaseModel> {}
export interface IBaseModelSnapshotOut extends SnapshotOut<IBaseModel> {}
export default BaseModel;
