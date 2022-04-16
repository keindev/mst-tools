import { Instance } from 'mobx-state-tree';

import { types } from '../../core/types';

export const DictionaryItemModel = types.model('DictionaryItemModel', {
  id: types.identifier,
  name: types.string,
});

export interface IDictionaryItemModel extends Instance<typeof DictionaryItemModel> {}
