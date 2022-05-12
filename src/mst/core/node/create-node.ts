import { AnyNode, ObjectNode, ScalarNode } from '../../internal';

export function isNode(value: any): value is AnyNode {
  return value instanceof ScalarNode || value instanceof ObjectNode;
}
