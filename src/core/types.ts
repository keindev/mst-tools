import { IModelType, ISimpleType, SnapshotIn, types as _types } from 'mobx-state-tree';
import { nanoid } from 'nanoid';

import { EMPTY_VALUE } from '../constants';
import { IEmptyObject } from '../types';
import { compose, model } from './methods';

export { getFlags } from './utils/getFlags';

const uid = _types.optional(_types.string, nanoid());
const empty = _types.optional(_types.string, EMPTY_VALUE);
const flag = _types.optional(_types.boolean, false);
const dispatcher = <T extends IModelType<{ type: ISimpleType<string> }, IEmptyObject>>(
  defaultType: T,
  map: { [key: string]: T }
): T =>
  types.union(
    {
      dispatcher({ type }: SnapshotIn<T>) {
        return map[type] ?? defaultType;
      },
    },
    defaultType,
    ...Object.values(map)
  ) as T;

const types = { ..._types, model, compose, flag, uid, empty, dispatcher };

export default types;
