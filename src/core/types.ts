import {
    getParent, hasParent, IAnyModelType, IModelType, Instance, IOptionalIType, IReferenceType, ISimpleType, isRoot,
    ModelProperties, OptionalDefaultValueOrFunction, SnapshotIn, types as _types,
} from 'mobx-state-tree';
import { nanoid } from 'nanoid';

import { IContext, IContextModel, IContextName, IContextWrapper, IEmptyObject, IObject } from '../types';
import { compose, model } from './methods';

export { getFlags } from './utils/getFlags';

const flag = _types.optional(_types.boolean, false);

const uid = (): IOptionalIType<ISimpleType<string>, [undefined]> => _types.optional(_types.string, nanoid());

const reserve = <M extends IAnyModelType>(
  type: M,
  value?: OptionalDefaultValueOrFunction<M>
): IOptionalIType<M, [undefined]> => _types.optional(type, value ?? {});

const empty = (value = ''): IOptionalIType<ISimpleType<string>, [undefined]> => _types.optional(_types.string, value);

const zero = (value = 0): IOptionalIType<ISimpleType<number>, [undefined]> => _types.optional(_types.number, value);

const dispatcher = <T extends IAnyModelType>(defaultType: T, map: { [key: string]: T }): T =>
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

// eslint-disable-next-line max-lines-per-function
export const context = <NAME extends string, V extends IObject>(
  name: NAME,
  views: (self: Instance<IContext<IObject>>, context: <T>() => T | undefined) => V
): IContextName<NAME> & IContextModel<NAME, V> & IContextWrapper<NAME> => {
  const wrapper = `__${name}ContextWrapper`;

  return {
    [`${name}Name`]: name,
    [`${name}Context`]: types.model('ContextModel', {}).views(
      (self: Instance<IContext<IEmptyObject>>): V =>
        views(self, <T>() => {
          let node = self;
          let result;

          while (hasParent(node) && !result) {
            if (wrapper in node && node[wrapper]) result = node;
            else node = getParent(node);
          }

          if (isRoot(node) && wrapper in node && node[wrapper]) result = node;

          return result as unknown as T;
        })
    ),
    [`${name}ContextWrapper`]: types.model(`${name}ContextWrapper`, { [wrapper]: types.frozen(true) }).named(name),
  } as IContextName<NAME> & IContextModel<NAME, V> & IContextWrapper<NAME>;
};

export const types = {
  ..._types,
  compose,
  context,
  dispatcher,
  empty,
  flag,
  model,
  reserve,
  uid,
  unique,
  uniqueRef,
  zero,
};
