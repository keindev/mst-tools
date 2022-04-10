import { flow } from 'mobx-state-tree';
import { FlowReturn } from 'mobx-state-tree/dist/internal';

import { IEffectFlagsMap } from '../types';

export const effect = <R, Args extends unknown[]>(
  generator: (...args: Args) => Generator<PromiseLike<unknown>, R>,
  flags: IEffectFlagsMap
): readonly [(...args: Args) => Promise<FlowReturn<R>>, IEffectFlagsMap] => [flow<R, Args>(generator), flags] as const;

export const effectToAction = (
  state: Record<string, boolean>,
  // eslint-disable-next-line @typescript-eslint/ban-types
  [field, [action, flags]]: [string, readonly [Function, IEffectFlagsMap]]
): // eslint-disable-next-line @typescript-eslint/ban-types
[string, Function] => {
  const [isLoadingFlag, isLoadedFlag] = Object.getOwnPropertyNames(flags);

  if (!isLoadingFlag) return [field, action];

  return [
    field,
    flow(function* (...args) {
      if (isLoadedFlag) state[isLoadedFlag] = false;

      state[isLoadingFlag] = true;

      const result = yield action(...args);

      state[isLoadingFlag] = false;

      if (isLoadedFlag) state[isLoadedFlag] = true;

      return result;
    }),
  ];
};

export default effect;
