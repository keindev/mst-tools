import { AnyNode, AnyObjectNode, ObjectNode, ScalarNode } from '../../internal';
import SimpleType from '../../types/complex/SimpleType';

export function createScalarNode<C, S, T>(
  type: SimpleType<C, S, T>,
  parent: AnyObjectNode | null,
  subpath: string,
  environment: any,
  initialValue: C
): ScalarNode<C, S, T> {
  return new ScalarNode(type, parent, subpath, environment, initialValue);
}

export function isNode(value: any): value is AnyNode {
  return value instanceof ScalarNode || value instanceof ObjectNode;
}
