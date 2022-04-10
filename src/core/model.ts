import {
    IAnyModelType, Instance, ModelActions, ModelPropertiesDeclaration, ModelPropertiesDeclarationToProperties,
    types as originalTypes,
} from 'mobx-state-tree';

import { IEffectFunction, IModelEffects, IModelType } from '../types';
import { effectToAction } from './effect';
import { getFlags } from './types/flag';

type IModelInstance<T> = {
  cloneAndEnhance(opts: { initializers?: ReadonlyArray<(instance: Instance<T>) => Instance<T>> }): IAnyModelType;
  instantiateActions(self: Instance<T>, actions: ModelActions): void;
};

const model = <P extends ModelPropertiesDeclaration = Record<string, never>>(
  name: string,
  properties?: P
): IModelType<ModelPropertiesDeclarationToProperties<P>, Record<string, never>> => {
  const store = originalTypes.model(name, properties);
  const flags = getFlags(properties);

  Object.defineProperty(store, 'effects', {
    enumerable: false,
    configurable: true,
    writable: true,
    value<E extends IModelEffects>(fn: IEffectFunction<typeof store, ModelPropertiesDeclarationToProperties<P>, E>) {
      const that = this as IModelInstance<typeof store>;

      return that.cloneAndEnhance({
        initializers: [
          (self: Instance<typeof store>): Instance<typeof store> => {
            that.instantiateActions(
              self,
              Object.fromEntries(Object.entries(fn(self, flags)).map(effect => effectToAction(self, effect)))
            );

            return self;
          },
        ],
      });
    },
  });

  return store as IModelType<ModelPropertiesDeclarationToProperties<P>, Record<string, never>>;
};

export default model;
