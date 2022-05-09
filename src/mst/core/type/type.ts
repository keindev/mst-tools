/* eslint-disable @typescript-eslint/indent */
/* eslint-disable max-classes-per-file */
import { action } from 'mobx';

import {
    AnyNode, AnyObjectNode, assertArg, BaseNode, fail, getStateTreeNode, getStateTreeNodeSafe, getType, IChildNodesMap,
    IJsonPatch, isMutable, isStateTreeNode, IStateTreeNode, IValidationContext, IValidationResult, ModelPrimitive,
    normalizeIdentifier, ObjectNode, ScalarNode, typeCheckFailure, typecheckInternal, typeCheckSuccess,
} from '../../internal';

export enum TypeFlags {
  String = 1,
  Number = 1 << 1,
  Boolean = 1 << 2,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Date = 1 << 3,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Literal = 1 << 4,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Array = 1 << 5,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Map = 1 << 6,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Object = 1 << 7,
  Frozen = 1 << 8,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Optional = 1 << 9,
  Reference = 1 << 10,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Identifier = 1 << 11,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Late = 1 << 12,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Refinement = 1 << 13,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Union = 1 << 14,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Null = 1 << 15,
  Undefined = 1 << 16,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Integer = 1 << 17,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Custom = 1 << 18,
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  SnapshotProcessor = 1 << 19,
}

export const cannotDetermineSubtype = 'cannotDetermine';

/** A state tree node value. */
export type STNValue<T, IT extends IAnyType> = T extends object ? T & IStateTreeNode<IT> : T;

const $type: unique symbol = Symbol('$type');

/** A type, either complex or simple. */
export interface IType<C, S, T> {
  // fake, will never be present, just for typing
  readonly [$type]: undefined;
  /** @deprecated use `SnapshotIn<typeof MyType>` instead. */
  readonly CreationType: C;
  /** @deprecated use `SnapshotOut<typeof MyType>` instead. */
  readonly SnapshotType: S;
  /** @deprecated use `Instance<typeof MyType>` instead. */
  readonly Type: STNValue<T, this>;
  /** @deprecated do not use. */
  readonly TypeWithoutSTN: T;
  flags: TypeFlags;
  /** Name of the identifier attribute or null if none. */
  readonly identifierAttribute?: string;
  isType: true;

  /** Friendly type name. */
  name: string;

  /** Creates an instance for the type given an snapshot input */
  create(snapshot?: C, env?: any): this['Type'];

  /** Gets the textual representation of the type as a string */
  describe(): string;

  getSnapshot(node: BaseNode<S, T>, applyPostProcess?: boolean): S;
  getSubTypes(): IAnyType[] | IAnyType | null | typeof cannotDetermineSubtype;
  instantiate(parent: AnyObjectNode | null, subpath: string, environment: any, initialValue: C | T): BaseNode<S, T>;
  /**
   * Checks if a given snapshot / instance is of the given type.
   *
   * @param thing Snapshot or instance to be checked.
   * @returns true if the value is of the current type, false otherwise.
   */
  is(thing: any): thing is C | this['Type'];
  isAssignableFrom(type: IAnyType): boolean;
  reconcile(current: BaseNode<S, T>, newValue: C | T, parent: AnyObjectNode, subpath: string): BaseNode<S, T>;

  /**
   * Run's the type's typechecker on the given value with the given validation context.
   *
   * @param thing Value to be checked, either a snapshot or an instance.
   * @param context Validation context, an array of { subpaths, subtypes } that should be validated
   * @returns The validation result, an array with the list of validation errors.
   */
  validate(thing: C, context: IValidationContext): IValidationResult;
}

/** Any kind of type. */
export interface IAnyType extends IType<any, any, any> {}

/**
 * A simple type, this is, a type where the instance and the snapshot representation are the same.
 */
export interface ISimpleType<T> extends IType<T, T, T> {}

export type Primitives = ModelPrimitive | null | undefined;

/**
 * A complex type.
 * @deprecated just for compatibility with old versions, could be deprecated on the next major version
 */
export interface IComplexType<C, S, T> extends IType<C, S, T & object> {}

/**
 * Any kind of complex type.
 */
export interface IAnyComplexType extends IType<any, any, object> {}

export type ExtractCSTWithoutSTN<
  IT extends { [$type]: undefined; CreationType: any; SnapshotType: any; TypeWithoutSTN: any }
> = IT['CreationType'] | IT['SnapshotType'] | IT['TypeWithoutSTN'];
/** @hidden */
export type ExtractCSTWithSTN<IT extends { [$type]: undefined; CreationType: any; SnapshotType: any; Type: any }> =
  | IT['CreationType']
  | IT['SnapshotType']
  | IT['Type'];

/**
 * The instance representation of a given type.
 */
export type Instance<T> = T extends { [$type]: undefined; Type: any } ? T['Type'] : T;

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

/**
 * A type which is equivalent to the union of SnapshotIn and Instance types of a given typeof TYPE or typeof VARIABLE.
 * For primitives it defaults to the primitive itself.
 *
 * For example:
 * - `SnapshotOrInstance<typeof ModelA> = SnapshotIn<typeof ModelA> | Instance<typeof ModelA>`
 * - `SnapshotOrInstance<typeof self.a (where self.a is a ModelA)> = SnapshotIn<typeof ModelA> | Instance<typeof ModelA>`
 *
 * Usually you might want to use this when your model has a setter action that sets a property.
 *
 * Example:
 * ```ts
 * const ModelA = types.model('', {
 *   n: types.number
 * })
 *
 * const ModelB = types.model('', {
 *   innerModel: ModelA
 * }).actions(self => ({
 *   // this will accept as property both the snapshot and the instance, whichever is preferred
 *   setInnerModel(m: SnapshotOrInstance<typeof self.innerModel>) {
 *     self.innerModel = cast(m)
 *   }
 * }))
 * ```
 */
export type SnapshotOrInstance<T> = SnapshotIn<T> | Instance<T>;

/**
 * A base type produces a MST node (Node in the state tree)
 *
 * @internal
 * @hidden
 */
export abstract class BaseType<C, S, T, N extends BaseNode<any, any> = BaseNode<S, T>> implements IType<C, S, T> {
  [$type]!: undefined;

  // these are just to make inner types avaialable to inherited classes
  readonly C!: C;
  readonly N!: N;
  readonly S!: S;
  readonly T!: T;

  readonly isType = true;
  readonly name: string;

  declare abstract flags: TypeFlags;

  constructor(name: string) {
    this.name = name;
  }

  get Type(): any {
    throw fail(
      // eslint-disable-next-line max-len
      'Factory.Type should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.Type`'
    );
  }
  get TypeWithoutSTN(): any {
    throw fail(
      // eslint-disable-next-line max-len
      'Factory.TypeWithoutSTN should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.TypeWithoutSTN`'
    );
  }
  get SnapshotType(): any {
    throw fail(
      // eslint-disable-next-line max-len
      'Factory.SnapshotType should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.SnapshotType`'
    );
  }
  get CreationType(): any {
    throw fail(
      // eslint-disable-next-line max-len
      'Factory.CreationType should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.CreationType`'
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  create(snapshot?: C, environment?: any) {
    typecheckInternal(this, snapshot);

    return this.instantiate(null, '', environment, snapshot!).value;
  }

  getSnapshot(_node: N, _applyPostProcess?: boolean): S {
    // istanbul ignore next
    throw fail('unimplemented method');
  }

  is(thing: any): thing is any {
    return this.validate(thing, [{ path: '', type: this }]).length === 0;
  }

  isAssignableFrom(type: IAnyType): boolean {
    return type === this;
  }

  validate(value: C | T, context: IValidationContext): IValidationResult {
    const node = getStateTreeNodeSafe(value);

    if (node) {
      const valueType = getType(value);

      return this.isAssignableFrom(valueType) ? typeCheckSuccess() : typeCheckFailure(context, value);
      // it is tempting to compare snapshots, but in that case we should always clone on assignments...
    }

    return this.isValidSnapshot(value as C, context);
  }

  abstract describe(): string;
  abstract getSubTypes(): IAnyType[] | IAnyType | null | typeof cannotDetermineSubtype;
  abstract instantiate(parent: AnyObjectNode | null, subpath: string, environment: any, initialValue: C | T): N;
  abstract isValidSnapshot(value: C, context: IValidationContext): IValidationResult;
  abstract reconcile(current: N, newValue: C | T, parent: AnyObjectNode, subpath: string): N;
}

BaseType.prototype.create = action(BaseType.prototype.create);

/**
 * @internal
 * @hidden
 */
export type AnyBaseType = BaseType<any, any, any, any>;

/**
 * @internal
 * @hidden
 */
export type ExtractNodeType<IT extends IAnyType> = IT extends BaseType<any, any, any, infer N> ? N : never;

/**
 * A complex type produces a MST node (Node in the state tree)
 *
 * @internal
 * @hidden
 */
export abstract class ComplexType<C, S, T> extends BaseType<C, S, T, ObjectNode<C, S, T>> {
  identifierAttribute?: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(name: string) {
    super(name);
  }

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

  isMatchingSnapshotId(current: this['N'], snapshot: C): boolean {
    return (
      !current.identifierAttribute ||
      current.identifier === normalizeIdentifier((snapshot as any)[current.identifierAttribute])
    );
  }

  reconcile(current: this['N'], newValue: C | T, parent: AnyObjectNode, subpath: string): this['N'] {
    const nodeReconciled = this.tryToReconcileNode(current, newValue);

    if (nodeReconciled) {
      current.setParent(parent, subpath);

      return current;
    }

    // current node cannot be recycled in any way
    current.die(); // noop if detaching

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

export abstract class SimpleType<C, S, T> extends BaseType<C, S, T, ScalarNode<C, S, T>> {
  createNewInstance(snapshot: C): T {
    return snapshot as any;
  }

  getSnapshot(node: this['N']): S {
    return node.storedValue;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getSubTypes() {
    return null;
  }

  getValue(node: this['N']): T {
    // if we ever find a case where scalar nodes can be accessed without iterating through its parent
    // uncomment this to make sure the parent chain is created when this is accessed
    // if (node.parent) {
    //     node.parent.createObservableInstanceIfNeeded()
    // }
    return node.storedValue;
  }

  reconcile(current: this['N'], newValue: C, parent: AnyObjectNode, subpath: string): this['N'] {
    // reconcile only if type and value are still the same, and only if the node is not detaching
    if (!current.isDetaching && current.type === this && current.storedValue === newValue) {
      return current;
    }

    const res = this.instantiate(parent, subpath, undefined, newValue);

    current.die(); // noop if detaching

    return res;
  }

  abstract instantiate(parent: AnyObjectNode | null, subpath: string, environment: any, initialValue: C): this['N'];
}

/** Returns if a given value represents a type */
export function isType(value: any): value is IAnyType {
  return typeof value === 'object' && value && value.isType === true;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function assertIsType(type: IAnyType, argNumber: number | number[]) {
  assertArg(type, isType, 'mobx-state-tree type', argNumber);
}
