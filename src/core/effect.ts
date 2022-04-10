import { flow } from 'mobx-state-tree';
import { FlowReturn } from 'mobx-state-tree/dist/internal';

import { IEffectFlagsMap } from '../types';

export const effect = <R, Args extends unknown[]>(
  generator: (...args: Args) => Generator<PromiseLike<unknown>, R>,
  flags: IEffectFlagsMap
): readonly [(...args: Args) => Promise<FlowReturn<R>>, IEffectFlagsMap] => [flow<R, Args>(generator), flags] as const;

export default effect;
