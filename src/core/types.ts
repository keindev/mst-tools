import { types as _types } from 'mobx-state-tree';
import { nanoid } from 'nanoid';

import compose from './compose';
import model from './model';

export { getFlags } from './utils/getFlags';

const uid = _types.optional(_types.string, nanoid());
const flag = _types.optional(_types.boolean, false);
const types = { ..._types, model, compose, flag, uid };

export default types;
