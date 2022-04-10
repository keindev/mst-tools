import {
    isOptionalType, ModelPropertiesDeclaration, ModelPropertiesDeclarationToProperties, types,
} from 'mobx-state-tree';

import { IEffectFlags } from '../../types';

export const flag = types.optional(types.boolean, false);

export const getFlags = <P extends ModelPropertiesDeclaration = Record<string, never>>(
  properties?: P
): IEffectFlags<ModelPropertiesDeclarationToProperties<P>> =>
  Object.entries(properties ?? {})
    .filter(
      ([, propertyType]) =>
        typeof propertyType === 'object' &&
        !(propertyType instanceof Date) &&
        isOptionalType(propertyType) &&
        propertyType.name === types.boolean.name
    )
    .reduce(
      (acc, [propertyName]) => ({ ...acc, [propertyName]: false }),
      {} as IEffectFlags<ModelPropertiesDeclarationToProperties<P>>
    );
