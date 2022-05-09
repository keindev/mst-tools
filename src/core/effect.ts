import { flow, ModelProperties } from '../mst/index';
import { FlowReturn } from '../mst/internal';
import { IFlags } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const effect = <P extends ModelProperties, R, Args extends any[]>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generator: (...args: Args) => Generator<PromiseLike<any>, R, any>,
  flags: IFlags<P>
): readonly [(...args: Args) => Promise<FlowReturn<R>>, IFlags<P>] => [flow<R, Args>(generator), flags] as const;

export default effect;
