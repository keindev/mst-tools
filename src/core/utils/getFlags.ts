import { isOptionalType, ModelPropertiesDeclaration, types } from 'mobx-state-tree';

import { IEmptyObject, IFlags, IProperties } from '../../types';

export const getFlags = <PROPS extends ModelPropertiesDeclaration = IEmptyObject>(
  properties?: PROPS
): IFlags<IProperties<PROPS>> =>
  Object.entries(properties ?? {})
    .filter(
      ([, propertyType]) =>
        typeof propertyType === 'object' &&
        !(propertyType instanceof Date) &&
        isOptionalType(propertyType) &&
        propertyType.name === types.boolean.name
    )
    .reduce((acc, [propertyName]) => ({ ...acc, [propertyName]: false }), {} as IFlags<IProperties<PROPS>>);
