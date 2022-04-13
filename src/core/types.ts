import {
    IModelType, IOptionalIType, IReferenceType, ISimpleType, ModelProperties, OptionalDefaultValueOrFunction,
    SnapshotIn, types as _types,
} from 'mobx-state-tree';
import { nanoid } from 'nanoid';

import { EMPTY_VALUE } from '../constants';
import { IEmptyObject } from '../types';
import { compose, model } from './methods';

export { getFlags } from './utils/getFlags';

const uid = (): IOptionalIType<ISimpleType<string>, [undefined]> => _types.optional(_types.string, nanoid());
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

export const unique = <P extends ModelProperties, O extends IEmptyObject>(
  type: IModelType<P, O>
): IOptionalIType<IModelType<P, O>, [undefined]> =>
  types.optional(type, { id: type.name } as OptionalDefaultValueOrFunction<IModelType<P, O>>);

export const uniqueRef = <P extends ModelProperties, O extends IEmptyObject>(
  type: IModelType<P, O>,
  value?: string
): IOptionalIType<IReferenceType<IModelType<P, O>>, [undefined]> =>
  types.optional(types.reference(type), value ?? type.name);

const types = { ..._types, model, compose, flag, uid, empty, dispatcher, unique, uniqueRef };

export default types;
