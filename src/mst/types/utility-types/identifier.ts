/* eslint-disable max-classes-per-file */
import { TypeFlags } from '../../core/enums';
import SimpleType, { ISimpleType } from '../../core/type/SimpleType';
import { isType } from '../../core/type/type-utils';
import {
    AnyObjectNode, assertArg, fail, IValidationContext, IValidationResult, ModelType, ScalarNode, typeCheckFailure,
    typeCheckSuccess,
} from '../../internal';

abstract class BaseIdentifierType<T> extends SimpleType<T, T, T> {
  readonly flags = TypeFlags.Identifier;

  // eslint-disable-next-line @typescript-eslint/no-parameter-properties
  constructor(name: string, private readonly validType: 'string' | 'number') {
    super(name);
  }

  instantiate(parent: AnyObjectNode | null, subpath: string, environment: any, initialValue: this['C']): this['N'] {
    if (!(parent?.type instanceof ModelType)) {
      throw fail('Identifier types can only be instantiated as direct child of a model type');
    }

    return super.instantiate(parent, subpath, environment, initialValue);
  }

  isValidSnapshot(value: this['C'], context: IValidationContext): IValidationResult {
    if (typeof value !== this.validType) {
      return typeCheckFailure(context, value, `Value is not a valid ${this.describe()}, expected a ${this.validType}`);
    }

    return typeCheckSuccess();
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  reconcile(current: this['N'], newValue: this['C'], parent: AnyObjectNode, subpath: string) {
    // we don't consider detaching here since identifier are scalar nodes, and scalar nodes cannot be detached
    if (current.storedValue !== newValue) {
      throw fail(
        // eslint-disable-next-line max-len
        `Tried to change identifier from '${current.storedValue}' to '${newValue}'. Changing identifiers is not allowed.`
      );
    }

    current.setParent(parent, subpath);

    return current;
  }
}

export class IdentifierType extends BaseIdentifierType<string> {
  readonly flags = TypeFlags.Identifier;

  constructor() {
    super('identifier', 'string');
  }
}

export class IdentifierNumberType extends BaseIdentifierType<number> {
  constructor() {
    super('identifierNumber', 'number');
  }

  getSnapshot(node: ScalarNode<number, number, number>): number {
    return node.storedValue;
  }
}

/**
 * `types.identifier` - Identifiers are used to make references, lifecycle events and reconciling works.
 * Inside a state tree, for each type can exist only one instance for each given identifier.
 * For example there couldn't be 2 instances of user with id 1. If you need more, consider using references.
 * Identifier can be used only as type property of a model.
 * This type accepts as parameter the value type of the identifier field that can be either string or number.
 *
 * Example:
 * ```ts
 *  const Todo = types.model("Todo", {
 *      id: types.identifier,
 *      title: types.string
 *  })
 * ```
 *
 * @returns
 */
export const identifier: ISimpleType<string> = new IdentifierType();

/**
 * `types.identifierNumber` - Similar to `types.identifier`. This one will serialize from / to a number when applying snapshots
 *
 * Example:
 * ```ts
 *  const Todo = types.model("Todo", {
 *      id: types.identifierNumber,
 *      title: types.string
 *  })
 * ```
 *
 * @returns
 */
export const identifierNumber: ISimpleType<number> = new IdentifierNumberType();

/**
 * Returns if a given value represents an identifier type.
 *
 * @param type
 * @returns
 */
export function isIdentifierType<IT extends typeof identifier | typeof identifierNumber>(type: IT): type is IT {
  return isType(type) && (type.flags & TypeFlags.Identifier) > 0;
}

/**
 * Valid types for identifiers.
 */
export type ReferenceIdentifier = string | number;

export function normalizeIdentifier(id: ReferenceIdentifier): string {
  return id.toString();
}

export function isValidIdentifier(id: unknown): id is ReferenceIdentifier {
  return typeof id === 'string' || typeof id === 'number';
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function assertIsValidIdentifier(id: ReferenceIdentifier, argNumber: number | number[]) {
  assertArg(id, isValidIdentifier, 'string or number (identifier)', argNumber);
}
