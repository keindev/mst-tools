import { getPropertyMembers, IModelType, ModelPropertiesDeclaration } from 'mobx-state-tree';

import { IEmptyObject, IProperties } from '../../types';
import { getFlags } from '../utils/getFlags';
import { defineEffects } from './defineEffects';

export const defineProps = <P extends ModelPropertiesDeclaration = IEmptyObject>(
  store: Omit<IModelType<IProperties<P>, IEmptyObject>, 'effects'>
): void => {
  const { props: fn } = store;

  Object.defineProperty(store, 'props', {
    enumerable: false,
    configurable: true,
    writable: true,
    value<PROPS2 extends ModelPropertiesDeclaration = IEmptyObject>(
      properties: PROPS2
    ): IModelType<IProperties<P & PROPS2>, IEmptyObject> {
      const extendedStore = fn(properties) as IModelType<IProperties<P & PROPS2>, IEmptyObject>;
      const extendedFlags = getFlags<P & PROPS2>(getPropertyMembers(extendedStore).properties as P & PROPS2);

      defineEffects<P & PROPS2>(extendedStore, extendedFlags);

      return extendedStore;
    },
  });
};
