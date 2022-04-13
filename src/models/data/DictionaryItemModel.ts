import { Instance, SnapshotIn, SnapshotOut } from 'mobx-state-tree';

import types from '../../core/types';

const DictionaryItemModel = types.model('DictionaryItemModel', {
  id: types.identifier,
  name: types.string,
});

export interface IDictionaryItemModel extends Instance<typeof DictionaryItemModel> {}
export interface IDictionaryItemModelSnapshotIn extends SnapshotIn<IDictionaryItemModel> {}
export interface IDictionaryItemModelSnapshotOut extends SnapshotOut<IDictionaryItemModel> {}
export default DictionaryItemModel;
