import { AnyObjectNode, BaseNode, IValidationContext, IValidationResult } from '../../internal';
import { $type, cannotDetermineSubtype } from '../constants';
import { TypeFlags } from '../enums';
import { IStateTreeNode } from '../node/node-utils';

/** Any kind of type. */
export interface IAnyType extends IType<any, any, any> {}
/** A state tree node value. */
export type StateTreeNodeValue<T, IT extends IAnyType> = T extends object ? T & IStateTreeNode<IT> : T;

/** A type, either complex or simple. */
export interface IType<C, S, T> {
  // fake, will never be present, just for typing
  readonly [$type]: undefined;
  /** @deprecated use `SnapshotIn<typeof MyType>` instead. */
  readonly CreationType: C;
  /** @deprecated use `SnapshotOut<typeof MyType>` instead. */
  readonly SnapshotType: S;
  /** @deprecated use `Instance<typeof MyType>` instead. */
  readonly Type: StateTreeNodeValue<T, this>;
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
