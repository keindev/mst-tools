import { types } from '../../core/types';
import { Instance } from '../../mst/index';
import { DictionaryItemModel } from './DictionaryItem';
import { SessionModel } from './Session';

export const DictionaryModel = SessionModel.named('ReferenceModel').props({
  items: types.array(DictionaryItemModel),
  name: types.empty(),
  type: types.identifier,
});

export interface IDictionaryModel extends Instance<typeof DictionaryModel> {}
