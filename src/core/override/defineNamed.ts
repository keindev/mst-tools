import { IModelType, ModelPropertiesDeclaration } from 'mobx-state-tree';

import { IEffectFlags, IEmptyObject, IProperties } from '../../types';
import { defineEffects } from './defineEffects';
import { defineProps } from './defineProps';

export const defineNamed = <P extends ModelPropertiesDeclaration = IEmptyObject>(
  store: Omit<IModelType<IProperties<P>, IEmptyObject>, 'effects'>,
  flags: IEffectFlags<IProperties<P>>
): void => {
  const { named: fn } = store;

  Object.defineProperty(store, 'named', {
    enumerable: false,
    configurable: true,
    writable: true,
    value(newName: string): IModelType<IProperties<P>, IEmptyObject> {
      const extendedStore = fn(newName) as IModelType<IProperties<P>, IEmptyObject>;

      defineProps(extendedStore);
      defineEffects(extendedStore, flags);

      return extendedStore;
    },
  });
};
