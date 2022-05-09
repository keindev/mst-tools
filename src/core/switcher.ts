import { ModelProperties } from '../mst/index';
import { IFlags } from '../types';

export const switcher = <P extends ModelProperties>(flags: IFlags<P>): IFlags<P> => flags;

export default switcher;
