import { Instance, SnapshotIn, SnapshotOut } from 'mobx-state-tree';

import types from '../../core/types';

const BaseModel = types.model('BaseModel', {
  id: types.uid,
});

export interface IBaseModel extends Instance<typeof BaseModel> {}
export interface IBaseModelSnapshotIn extends SnapshotIn<IBaseModel> {}
export interface IBaseModelSnapshotOut extends SnapshotOut<IBaseModel> {}
export default BaseModel;
