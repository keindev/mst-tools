import {
    getParent, hasParent, IAnyModelType, IModelType, Instance, IOptionalIType, IReferenceType, ISimpleType, isRoot,
    ModelProperties, OptionalDefaultValueOrFunction, SnapshotIn, types as _types,
} from 'mobx-state-tree';
import { nanoid } from 'nanoid';

import { EMPTY_VALUE } from '../constants';
import { IContext, IContextModel, IContextName, IContextWrapper, IEmptyObject, IObject } from '../types';
import { compose, model } from './methods';

export { getFlags } from './utils/getFlags';

const flag = _types.optional(_types.boolean, false);
const uid = (): IOptionalIType<ISimpleType<string>, [undefined]> => _types.optional(_types.string, nanoid());
const reserve = <M extends IAnyModelType>(type: M): IOptionalIType<M, [undefined]> => _types.optional(type, {});
const empty = (value = EMPTY_VALUE): IOptionalIType<ISimpleType<string>, [undefined]> =>
  _types.optional(_types.string, value);

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

export const context = <NAME extends string, V extends IObject>(
  name: NAME,
  views: (self: Instance<IContext<IObject>>) => V
): IContextName<NAME> & IContextModel<NAME, V> & IContextWrapper<NAME> => {
  const field = Symbol(`_contextModel_${nanoid()}`);
  const wrapper = Symbol(`_contextWrapper_${name}`);

  return {
    [`${name}Name`]: name,
    [`${name}Context`]: types
      .model(name, {
        [field]: types.frozen(name),
      })
      .views(self => ({
        _getContext<T>(): T {
          let result;

          if (hasParent(self)) {
            let node = getParent<{ [wrapper]: string | undefined }>(self);

            while (hasParent(node) && !result && !isRoot(node)) {
              if (wrapper in node && node[wrapper] === self[field]) result = node;
              else node = getParent(node);
            }
          }

          return result as unknown as T;
        },
      }))
      .views(views),
    [`${name}ContextWrapper`]: types
      .model(`${name}ContextWrapper`, {
        [wrapper]: types.optional(types.string, name),
      })
      .named(name),
  } as IContextName<NAME> & IContextModel<NAME, V> & IContextWrapper<NAME>;
};

const types = {
  ..._types,
  compose,
  context,
  dispatcher,
  empty,
  reserve,
  flag,
  model,
  uid,
  unique,
  uniqueRef,
};

export default types;
