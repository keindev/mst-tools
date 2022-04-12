import { IFlagsMap, IFunction } from '../../types';

export const getSwitchAction = (
  state: Record<string, boolean>,
  [field, flags]: [string, IFlagsMap]
): [string, IFunction] => {
  const keys = Object.getOwnPropertyNames(flags);

  return [field, () => keys.forEach(key => typeof state[key] !== 'undefined' && (state[key] = !!flags[key]))];
};
