/* eslint-disable @typescript-eslint/indent */
/* eslint-disable max-classes-per-file */

import { assertArg } from '../../utils';
import { $type } from '../constants';
import BaseType from './BaseType';
import { IAnyType } from './Type';

export type ExtractCSTWithSTN<IT extends { [$type]: undefined; CreationType: any; SnapshotType: any; Type: any }> =
  | IT['CreationType']
  | IT['SnapshotType']
  | IT['Type'];

export type ExtractNodeType<IT extends IAnyType> = IT extends BaseType<any, any, any, infer N> ? N : never;

/** Returns if a given value represents a type */
export function isType(value: any): value is IAnyType {
  return typeof value === 'object' && value && value.isType === true;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function assertIsType(type: IAnyType, argNumber: number | number[]) {
  assertArg(type, isType, 'mobx-state-tree type', argNumber);
}
