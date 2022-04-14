import { flow, ModelProperties } from 'mobx-state-tree';
import { FlowReturn } from 'mobx-state-tree/dist/internal';

import { IFlags } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const effect = <P extends ModelProperties, R, Args extends any[]>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generator: (...args: Args) => Generator<PromiseLike<any>, R>,
  flags: IFlags<P>
): readonly [(...args: Args) => Promise<FlowReturn<R>>, IFlags<P>] => [flow<R, Args>(generator), flags] as const;

export default effect;
