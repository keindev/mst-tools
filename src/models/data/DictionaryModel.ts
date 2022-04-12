import { Instance, SnapshotIn, SnapshotOut } from 'mobx-state-tree';

import types from '../../core/types';
import DictionaryItemModel from './DictionaryItemModel';
import SessionModel from './SessionModel';

const DictionaryModel = SessionModel.named('ReferenceModel').props({
  items: types.array(DictionaryItemModel),
  name: types.frozen(types.string),
  type: types.identifier,
});

export interface IDictionaryModel extends Instance<typeof DictionaryModel> {}
export interface IDictionaryModelSnapshotIn extends SnapshotIn<IDictionaryModel> {}
export interface IDictionaryModelSnapshotOut extends SnapshotOut<IDictionaryModel> {}
export default DictionaryModel;
