import { isOptionalType, ModelPropertiesDeclaration, types } from 'mobx-state-tree';

import { IEffectFlags, IEmptyObject, IProperties } from '../../types';

export const getFlags = <P extends ModelPropertiesDeclaration = IEmptyObject>(
  properties?: P
): IEffectFlags<IProperties<P>> =>
  Object.entries(properties ?? {})
    .filter(
      ([, propertyType]) =>
        typeof propertyType === 'object' &&
        !(propertyType instanceof Date) &&
        isOptionalType(propertyType) &&
        propertyType.name === types.boolean.name
    )
    .reduce((acc, [propertyName]) => ({ ...acc, [propertyName]: false }), {} as IEffectFlags<IProperties<P>>);
