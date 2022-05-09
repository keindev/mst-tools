import { types } from '../../core/types';
import { Instance } from '../../mst/index';

export const DictionaryItemModel = types.model('DictionaryItemModel', {
  id: types.identifier,
  name: types.string,
});

export interface IDictionaryItemModel extends Instance<typeof DictionaryItemModel> {}
