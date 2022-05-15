import { $type } from '../constants';

/** The instance representation of a given type. */
export type Instance<T> = T extends { [$type]: undefined; Type: any } ? T['Type'] : T;
