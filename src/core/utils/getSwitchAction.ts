import { ModelProperties } from 'mobx-state-tree';

import { IFlags, IFunction } from '../../types';

export const getSwitchAction = <P extends ModelProperties>(
  state: Record<keyof IFlags<P>, boolean>,
  [field, flags]: [string, IFlags<P>]
): [string, IFunction] => {
  const keys = Object.getOwnPropertyNames(flags) as (keyof IFlags<P>)[];

  return [field, () => keys.forEach(key => (state[key] = !!flags[key]))];
};
