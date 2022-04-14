import {
    applySnapshot, detach, getSnapshot, IAnyModelType, IMSTArray, Instance, SnapshotIn, SnapshotOut,
} from 'mobx-state-tree';

import { EMPTY_VALUE } from '../../constants';
import types from '../../core/types';
import { IFunction } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const process = async (functions: (IFunction | undefined)[], parallel = true): Promise<any[]> => {
  let result = [];

  if (parallel) {
    result = await Promise.all(functions.map(fn => fn && fn()));
  } else {
    let promise;

    for (const fn of functions) {
      if (fn) {
        promise = fn();
        result.push(promise instanceof Promise ? await promise : promise);
      } else {
        result.push(fn);
      }
    }
  }

  return result;
};

const BaseModel = types
  .model('BaseModel', {
    id: types.uid(),
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
    patch<T extends IAnyModelType>(snapshot: SnapshotIn<Instance<T>>) {
      applySnapshot(self, { ...getSnapshot(self), ...snapshot });
    },
    detach: (lists: IMSTArray<IAnyModelType>[]) => () => {
      lists.forEach(list => {
        list.forEach(item => detach(item));
        list.clear();
      });
    },
  }));

export interface IBaseModel extends Instance<typeof BaseModel> {}
export interface IBaseModelSnapshotIn extends SnapshotIn<IBaseModel> {}
export interface IBaseModelSnapshotOut extends SnapshotOut<IBaseModel> {}
export default BaseModel;
