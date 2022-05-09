import { flow, ModelProperties } from '../../mst/index';
import { IFlags, IFunction } from '../../types';

export const getEffectAction = <P extends ModelProperties>(
  state: Record<string, boolean>,
  [field, [action, flags]]: [string, readonly [IFunction, IFlags<P>]]
): [string, IFunction] => {
  const [isLoadingFlag, isLoadedFlag] = Object.getOwnPropertyNames(flags);

  if (!isLoadingFlag) return [field, action];

  return [
    field,
    flow(function* (...args) {
      if (!state[isLoadingFlag] && (!isLoadedFlag || !state[isLoadedFlag])) {
        let result;

        try {
          if (isLoadedFlag) state[isLoadedFlag] = false;

          state[isLoadingFlag] = true;
          result = yield action(...args);
        } finally {
          state[isLoadingFlag] = false;

          if (isLoadedFlag) state[isLoadedFlag] = true;
        }

        return result;
      }
    }),
  ];
};
