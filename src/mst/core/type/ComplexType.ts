import { action } from 'mobx';

import {
    AnyNode, AnyObjectNode, fail, getStateTreeNode, getStateTreeNodeSafe, getType, IChildNodesMap, IJsonPatch,
    isMutable, isStateTreeNode, normalizeIdentifier, ObjectNode,
} from '../../internal';
import BaseType from './BaseType';
import { IAnyType, IType } from './Type';

/** Any kind of complex type. */
export interface IAnyComplexType extends IType<any, any, object> {}

/** A complex type produces a MST node (Node in the state tree) */
export default abstract class ComplexType<C, S, T> extends BaseType<C, S, T, ObjectNode<C, S, T>> {
  identifierAttribute?: string;

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  create(snapshot: C = this.getDefaultSnapshot(), environment?: any) {
    return super.create(snapshot, environment);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getSubTypes() {
    return null;
  }

  getValue(node: this['N']): T {
    node.createObservableInstanceIfNeeded();

    return node.storedValue;
  }

  instantiate(
    parent: AnyObjectNode | null,
    subpath: string,
    environment: any,
    initialValue: C | T
  ): ObjectNode<C, S, T> {
    const existingNode = getStateTreeNodeSafe(initialValue);

    if (existingNode) {
      if (existingNode.parent) {
        throw fail(
          // eslint-disable-next-line max-len
          `Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '${
            parent?.path ?? ''
          }/${subpath}', but it lives already at '${existingNode.path}'`
        );
      }

      if (parent) existingNode.setParent(parent, subpath);
      // else it already has no parent since it is a pre-requisite

      return existingNode;
    }

    // not a node, a snapshot
    return new ObjectNode(this, parent, subpath, environment, initialValue as C);
  }

  isMatchingSnapshotId(current: this['N'], snapshot: C): boolean {
    return (
      !current.identifierAttribute ||
      current.identifier === normalizeIdentifier((snapshot as any)[current.identifierAttribute])
    );
  }

  reconcile(current: this['N'], newValue: C | T, parent: AnyObjectNode, subpath: string): this['N'] {
    if (this.tryToReconcileNode(current, newValue)) {
      current.setParent(parent, subpath);

      return current;
    }

    // current node cannot be recycled in any way
    // noop if detaching
    current.die();

    // attempt to reuse the new one
    if (isStateTreeNode(newValue) && this.isAssignableFrom(getType(newValue))) {
      // newValue is a Node as well, move it here..
      const newNode = getStateTreeNode(newValue);

      newNode.setParent(parent, subpath);

      return newNode;
    }

    // nothing to do, we have to create a new node
    return this.instantiate(parent, subpath, undefined, newValue);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private tryToReconcileNode(current: this['N'], newValue: C | T) {
    if (current.isDetaching) return false;
    if ((current.snapshot as any) === newValue) {
      // newValue is the current snapshot of the node, noop
      return true;
    }
    if (isStateTreeNode(newValue) && getStateTreeNode(newValue) === current) {
      // the current node is the same as the new one
      return true;
    }
    if (
      current.type === this &&
      isMutable(newValue) &&
      !isStateTreeNode(newValue) &&
      this.isMatchingSnapshotId(current, newValue as any)
    ) {
      // the newValue has no node, so can be treated like a snapshot
      // we can reconcile
      current.applySnapshot(newValue as C);

      return true;
    }

    return false;
  }

  abstract applyPatchLocally(node: this['N'], subpath: string, patch: IJsonPatch): void;
  abstract applySnapshot(node: this['N'], snapshot: C): void;
  abstract createNewInstance(childNodes: IChildNodesMap): T;
  abstract finalizeNewInstance(node: this['N'], instance: any): void;
  abstract getChildNode(node: this['N'], key: string): AnyNode;
  abstract getChildType(propertyName?: string): IAnyType;
  abstract getChildren(node: this['N']): ReadonlyArray<AnyNode>;
  abstract getDefaultSnapshot(): C;
  abstract initializeChildNodes(node: this['N'], snapshot: any): IChildNodesMap;
  abstract processInitialSnapshot(childNodes: IChildNodesMap, snapshot: C): S;
  abstract removeChild(node: this['N'], subpath: string): void;
}

ComplexType.prototype.create = action(ComplexType.prototype.create);
