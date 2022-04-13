import { isOptionalType, ModelPropertiesDeclaration, types } from 'mobx-state-tree';

import { IEmptyObject, IFlags, IProperties } from '../../types';

export const getFlags = <PROPS extends ModelPropertiesDeclaration = IEmptyObject>(
  properties?: PROPS
): Required<IFlags<IProperties<PROPS>>> =>
  Object.entries(properties ?? {})
    .filter(
      ([, propertyType]) =>
        typeof propertyType === 'object' &&
        !(propertyType instanceof Date) &&
        isOptionalType(propertyType) &&
        propertyType.name === types.boolean.name
    )
    .reduce((acc, [propertyName]) => ({ ...acc, [propertyName]: false }), {} as Required<IFlags<IProperties<PROPS>>>);
