import { IModelType, Instance, ModelPropertiesDeclaration } from 'mobx-state-tree';

import {
    IEffectFlags, IEffectFunction, IEmptyObject, IModelEffects, IModelTypeInstance, IProperties,
} from '../../types';
import { getAction } from '../utils/getAction';

export const defineEffects = <P extends ModelPropertiesDeclaration = IEmptyObject>(
  store: Omit<IModelType<IProperties<P>, IEmptyObject>, 'effects'>,
  flags: IEffectFlags<IProperties<P>>
): void => {
  Object.defineProperty(store, 'effects', {
    enumerable: false,
    configurable: true,
    writable: true,
    value<E extends IModelEffects>(fn: IEffectFunction<typeof store, IProperties<P>, E>) {
      const that = this as IModelTypeInstance<typeof store>;

      return that.cloneAndEnhance({
        initializers: [
          (self: Instance<typeof store>): Instance<typeof store> => {
            that.instantiateActions(
              self,
              Object.fromEntries(Object.entries(fn(self, flags)).map(effect => getAction(self, effect)))
            );

            return self;
          },
        ],
      });
    },
  });
};
