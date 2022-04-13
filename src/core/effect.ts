import { flow } from 'mobx-state-tree';
import { FlowReturn } from 'mobx-state-tree/dist/internal';

import { IFlagsMap } from '../types';

export const effect = <R, Args extends unknown[]>(
  generator: (...args: Args) => Generator<PromiseLike<unknown>, R>,
  flags: IFlagsMap
): readonly [(...args: Args) => Promise<FlowReturn<R>>, IFlagsMap] => [flow<R, Args>(generator), flags] as const;

export default effect;
