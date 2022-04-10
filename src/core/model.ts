import { ModelPropertiesDeclaration, types as _types } from 'mobx-state-tree';

import { IEmptyObject, IModelType, IProperties } from '../types';
import { defineEffects } from './override/defineEffects';
import { defineNamed } from './override/defineNamed';
import { defineProps } from './override/defineProps';
import { getFlags } from './utils/getFlags';

const model = <P extends ModelPropertiesDeclaration = IEmptyObject>(
  name: string,
  properties?: P
): IModelType<IProperties<P>, IEmptyObject> => {
  const store = _types.model(name, properties) as IModelType<IProperties<P>, IEmptyObject>;
  const flags = getFlags(properties);

  defineNamed(store, flags);
  defineProps(store);
  defineEffects(store, flags);

  return store;
};

export default model;
