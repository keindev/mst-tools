import { AnyObjectNode, BaseType, ScalarNode } from '../../internal';

export default abstract class SimpleType<C, S, T> extends BaseType<C, S, T, ScalarNode<C, S, T>> {
  createNewInstance(snapshot: C): T {
    return snapshot as unknown as T;
  }

  getSnapshot(node: this['N']): S {
    return node.storedValue;
  }

  getSubTypes(): null {
    return null;
  }

  getValue(node: this['N']): T {
    return node.storedValue;
  }

  instantiate(parent: AnyObjectNode | null, subpath: string, environment: any, initialValue: C): this['N'] {
    return new ScalarNode(this, parent, subpath, environment, initialValue);
  }

  reconcile(current: this['N'], newValue: C, parent: AnyObjectNode, subpath: string): this['N'] {
    // reconcile only if type and value are still the same, and only if the node is not detaching
    if (!current.isDetaching && current.type === this && current.storedValue === newValue) {
      return current;
    }

    const res = this.instantiate(parent, subpath, undefined, newValue);

    // noop if detaching
    current.die();

    return res;
  }
}
