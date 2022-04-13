import { flow, ModelProperties } from 'mobx-state-tree';
import { FlowReturn } from 'mobx-state-tree/dist/internal';

import { IFlags } from '../types';

export const effect = <P extends ModelProperties, R, Args extends unknown[]>(
  generator: (...args: Args) => Generator<PromiseLike<unknown>, R>,
  flags: IFlags<P>
): readonly [(...args: Args) => Promise<FlowReturn<R>>, IFlags<P>] => [flow<R, Args>(generator), flags] as const;

export default effect;
