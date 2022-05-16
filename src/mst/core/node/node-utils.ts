import {
    AnyNode, AnyObjectNode, assertArg, fail, joinJsonPath, ObjectNode, ScalarNode, splitJsonPath,
} from '../../internal';
import { Instance } from '../state/Instance';
import { IAnyComplexType } from '../type/ComplexType';
import { IAnyType, IType, StateTreeNodeValue } from '../type/Type';

declare const $stateTreeNodeType: unique symbol;

/** Common interface that represents a node instance */
export interface IStateTreeNode<IT extends IAnyType = IAnyType> {
  // fake, will never be present, just for typing
  // we use this weird trick to solve an issue with reference types
  readonly [$stateTreeNodeType]?: [IT] | [any];
  readonly $treeNode?: any;
}

export type TypeOfValue<T extends IAnyStateTreeNode> = T extends IStateTreeNode<infer IT> ? IT : never;

/** Represents any state tree node instance */
export interface IAnyStateTreeNode extends StateTreeNodeValue<any, IAnyType> {}

/**
 * Returns true if the given value is a node in a state tree.
 * More precisely, that is, if the value is an instance of a
 * `types.model`, `types.array` or `types.map`.
 */
export function isStateTreeNode<IT extends IAnyComplexType>(value: any): value is StateTreeNodeValue<Instance<IT>, IT> {
  return !!(value && value.$treeNode);
}

export function assertIsStateTreeNode(value: IAnyStateTreeNode, argNumber: number | number[]): void {
  assertArg(value, isStateTreeNode, 'mobx-state-tree node', argNumber);
}

export function getStateTreeNode(value: IAnyStateTreeNode): AnyObjectNode {
  if (!isStateTreeNode(value)) throw fail(`Value ${value} is no MST Node`);

  return value.$treeNode!;
}

export function getStateTreeNodeSafe(value: IAnyStateTreeNode): AnyObjectNode | null {
  return (value && value.$treeNode) || null;
}

export function toJSON<S>(this: IStateTreeNode<IType<any, S, any>>): S {
  return getStateTreeNode(this).snapshot;
}

export function getRelativePathBetweenNodes(base: AnyObjectNode, target: AnyObjectNode): string {
  // PRE condition target is (a child of) base!
  if (base.root !== target.root) {
    throw fail(
      `Cannot calculate relative path: objects '${base}' and '${target}' are not part of the same object tree`
    );
  }

  const baseParts = splitJsonPath(base.path);
  const targetParts = splitJsonPath(target.path);
  let common = 0;

  for (; common < baseParts.length; common++) {
    if (baseParts[common] !== targetParts[common]) break;
  }

  // TODO: assert that no targetParts paths are "..", "." or ""!
  return (
    baseParts
      .slice(common)
      .map(() => '..')
      .join('/') + joinJsonPath(targetParts.slice(common))
  );
}

export function resolveNodeByPath(base: AnyObjectNode, path: string, failIfResolveFails = true): AnyNode | undefined {
  return resolveNodeByPathParts(base, splitJsonPath(path), failIfResolveFails);
}

// eslint-disable-next-line max-lines-per-function
export function resolveNodeByPathParts(
  base: AnyObjectNode,
  pathParts: string[],
  failIfResolveFails = true
): AnyNode | undefined {
  let current: AnyNode | null = base;

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];

    if (part === '..') {
      current = current!.parent;

      // not everything has a parent
      if (current) continue;
    } else if (part === '.') {
      continue;
    } else if (current) {
      if (current instanceof ScalarNode) {
        // check if the value of a scalar resolves to a state tree node (e.g. references)
        // then we can continue resolving...
        try {
          const { value } = current;

          if (isStateTreeNode(value)) current = getStateTreeNode(value);
        } catch (e) {
          if (!failIfResolveFails) return undefined;

          throw e;
        }
      }

      if (current instanceof ObjectNode) {
        const subType = current.getChildType(part);

        if (subType) {
          current = current.getChildNode(part!);

          if (current) continue;
        }
      }
    }

    if (failIfResolveFails) {
      throw fail(
        `Could not resolve '${part}' in path '${
          joinJsonPath(pathParts.slice(0, i)) || '/'
        }' while resolving '${joinJsonPath(pathParts)}'`
      );
    } else return undefined;
  }

  return current!;
}
