/* eslint-disable @typescript-eslint/indent */
import { $type } from '../constants';
import { IStateTreeNode } from '../node/node-utils';

/** The input (creation) snapshot representation of a given type */
export type SnapshotIn<T> = T extends { [$type]: undefined; CreationType: any }
  ? T['CreationType']
  : T extends IStateTreeNode<infer IT>
  ? IT['CreationType']
  : T;

/** The output snapshot representation of a given type. */
export type SnapshotOut<T> = T extends { [$type]: undefined; SnapshotType: any }
  ? T['SnapshotType']
  : T extends IStateTreeNode<infer IT>
  ? IT['SnapshotType']
  : T;
