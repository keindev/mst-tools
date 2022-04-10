/*
import { flow, Instance, types } from 'mobx-state-tree';

import { ReferenceType } from '../../../types/enums';
import SessionDataSourceModel from '../data/SessionDataSource';
import ReferenceItemModel, { IReferenceItemModel, IReferenceItemModelSnapshotIn } from './ReferenceItem';

export const uninitializedReference = (to: ReferenceType | string): string => `__default${to}`;
export const uninitializedReferenceItem = (from: ReferenceType | string): IReferenceItemModelSnapshotIn => ({
  id: uninitializedReference(from),
  name: 'Uninitialized',
});

const ReferenceModel = SessionDataSourceModel.named('ReferenceModel')
  .props({
    type: types.union(types.identifier, types.enumeration(Object.values(ReferenceType))),
    _items: types.array(ReferenceItemModel),
  })
  .views(self => ({
    get label(): string {
      return (
        {
          [ReferenceType.X]: 'Все X',
          [ReferenceType.Y]: 'Все Y',
        }[self.type] ?? ''
      );
    },
    get items(): IReferenceItemModel[] {
      return self._items.filter(item => item.id !== uninitializedReference(self.type));
    },
    get name(): string {
      return (
        {
          [ReferenceType.X]: 'X',
          [ReferenceType.T]: 'T',
        }[self.type] ?? self.type
      );
    },
    getItem<T extends IReferenceItemModel>(id: string): T | undefined {
      return self._items.find(item => item.id === id) as T | undefined;
    },
  }))
  .actions(self => ({
    _load: flow(function* () {
      self._items = yield self.api.reference.get(self.type);
      self._items.push(uninitializedReferenceItem(self.type));
    }),
  }));

export interface IReferenceModel extends Instance<typeof ReferenceModel> {}
export default ReferenceModel;
*/
