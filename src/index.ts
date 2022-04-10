import { types as originalTypes } from 'mobx-state-tree';

import model from './core/model';
import { flag } from './core/types/flag';

export { effect } from './core/effect';

export const types = {
  ...originalTypes,
  model,
  flag,
};
