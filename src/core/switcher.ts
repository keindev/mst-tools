import { IFlags } from '../types';

export const switcher = <P>(flags: IFlags<P>): IFlags<P> => flags;

export default switcher;
