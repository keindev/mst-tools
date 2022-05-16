/* eslint-disable @typescript-eslint/indent */
/* eslint-disable max-classes-per-file */
import { DEV_MODE } from '../../core/constants';
import { NodeLifeCycle, TypeFlags } from '../../core/enums';
import { IAnyComplexType } from '../../core/type/ComplexType';
import SimpleType from '../../core/type/SimpleType';
import { IAnyType, IType } from '../../core/type/Type';
import { assertIsType } from '../../core/type/type-utils';
import {
    AnyNode, AnyObjectNode, applyPatch, fail, getIdentifier, getStateTreeNode, Hook, IAnyStateTreeNode, IDisposer,
    IMaybe, isModelType, isStateTreeNode, IStateTreeNode, isValidIdentifier, IValidationContext, IValidationResult,
    maybe, normalizeIdentifier, ReferenceIdentifier, typeCheckFailure, typeCheckSuccess,
} from '../../internal';

export type OnReferenceInvalidatedEvent<STN extends IAnyStateTreeNode> = {
  cause: 'detach' | 'destroy' | 'invalidSnapshotReference';
  invalidId: ReferenceIdentifier;
  invalidTarget: STN | undefined;
  parent: IAnyStateTreeNode;
  removeRef: () => void;
  replaceRef: (newRef: STN | null | undefined) => void;
};

export type OnReferenceInvalidated<STN extends IAnyStateTreeNode> = (event: OnReferenceInvalidatedEvent<STN>) => void;

function getInvalidationCause(hook: Hook): 'detach' | 'destroy' | undefined {
  switch (hook) {
    case Hook.beforeDestroy:
      return 'destroy';
    case Hook.beforeDetach:
      return 'detach';
    default:
      return undefined;
  }
}

export type ReferenceT<IT extends IAnyType> = IT['TypeWithoutSTN'] & IStateTreeNode<IReferenceType<IT>>;

class StoredReference<IT extends IAnyType> {
  readonly identifier!: ReferenceIdentifier;
  node!: AnyNode;

  private resolvedReference?: {
    lastCacheModification: string;
    node: AnyObjectNode;
  };

  // eslint-disable-next-line @typescript-eslint/no-parameter-properties
  constructor(value: ReferenceT<IT> | ReferenceIdentifier, private readonly targetType: IT) {
    if (isValidIdentifier(value)) {
      this.identifier = value;
    } else if (isStateTreeNode(value)) {
      const targetNode = getStateTreeNode(value);

      if (!targetNode.identifierAttribute) throw fail(`Can only store references with a defined identifier attribute.`);

      const id = targetNode.unnormalizedIdentifier;

      if (id === null || id === undefined) {
        throw fail(`Can only store references to tree nodes with a defined identifier.`);
      }

      this.identifier = id;
    } else {
      throw fail(`Can only store references to tree nodes or identifiers, got: '${value}'`);
    }
  }

  get resolvedValue(): ReferenceT<IT> {
    this.updateResolvedReference(this.node);

    return this.resolvedReference!.node.value;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private updateResolvedReference(node: AnyNode) {
    const normalizedId = normalizeIdentifier(this.identifier);
    const { root } = node;
    const lastCacheModification = root.identifierCache!.getLastCacheModificationPerId(normalizedId);

    if (!this.resolvedReference || this.resolvedReference.lastCacheModification !== lastCacheModification) {
      const { targetType } = this;
      // reference was initialized with the identifier of the target

      const target = root.identifierCache!.resolve(targetType, normalizedId);

      if (!target) {
        throw new InvalidReferenceError(
          // eslint-disable-next-line max-len
          `[mobx-state-tree] Failed to resolve reference '${this.identifier}' to type '${this.targetType.name}' (from node: ${node.path})`
        );
      }

      this.resolvedReference = { lastCacheModification, node: target! };
    }
  }
}

/**
 * @internal
 * @hidden
 */
export class InvalidReferenceError extends Error {
  constructor(m: string) {
    super(m);

    Object.setPrototypeOf(this, InvalidReferenceError.prototype);
  }
}

export abstract class BaseReferenceType<IT extends IAnyComplexType> extends SimpleType<
  ReferenceIdentifier,
  ReferenceIdentifier,
  IT['TypeWithoutSTN']
> {
  readonly flags = TypeFlags.Reference;

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-parameter-properties
    protected readonly targetType: IT,
    // eslint-disable-next-line @typescript-eslint/no-parameter-properties
    private readonly onInvalidated?: OnReferenceInvalidated<ReferenceT<IT>>
  ) {
    super(`reference(${targetType.name})`);
  }

  isAssignableFrom(type: IAnyType): boolean {
    return this.targetType.isAssignableFrom(type);
  }

  isValidSnapshot(value: this['C'], context: IValidationContext): IValidationResult {
    return isValidIdentifier(value)
      ? typeCheckSuccess()
      : typeCheckFailure(context, value, 'Value is not a valid identifier, which is a string or a number');
  }

  // eslint-disable-next-line max-lines-per-function, @typescript-eslint/explicit-function-return-type
  protected watchTargetNodeForInvalidations(
    storedRefNode: this['N'],
    identifier: ReferenceIdentifier,
    customGetSet: ReferenceOptionsGetSet<IT> | undefined
  ) {
    if (!this.onInvalidated) {
      return;
    }

    let onRefTargetDestroyedHookDisposer: IDisposer | undefined;

    // get rid of the watcher hook when the stored ref node is destroyed
    // detached is ignored since scalar nodes (where the reference resides) cannot be detached
    storedRefNode.registerHook(Hook.beforeDestroy, () => {
      if (onRefTargetDestroyedHookDisposer) {
        onRefTargetDestroyedHookDisposer();
      }
    });

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const startWatching = (sync: boolean) => {
      // re-create hook in case the stored ref gets reattached
      if (onRefTargetDestroyedHookDisposer) onRefTargetDestroyedHookDisposer();

      // make sure the target node is actually there and initialized
      const storedRefParentNode = storedRefNode.parent;
      const storedRefParentValue = storedRefParentNode && storedRefParentNode.storedValue;

      if (storedRefParentNode && storedRefParentNode.isAlive && storedRefParentValue) {
        let refTargetNodeExists: boolean;

        if (customGetSet) {
          refTargetNodeExists = !!customGetSet.get(identifier, storedRefParentValue);
        } else {
          refTargetNodeExists = storedRefNode.root.identifierCache!.has(
            this.targetType,
            normalizeIdentifier(identifier)
          );
        }

        if (!refTargetNodeExists) {
          // we cannot change the reference in sync mode
          // since we are in the middle of a reconciliation/instantiation and the change would be overwritten
          // for those cases just let the wrong reference be assigned and fail upon usage
          // (like current references do)
          // this means that effectively this code will only run when it is created from a snapshot
          if (!sync) {
            this.fireInvalidated('invalidSnapshotReference', storedRefNode, identifier, null);
          }
        } else {
          onRefTargetDestroyedHookDisposer = this.addTargetNodeWatcher(storedRefNode, identifier);
        }
      }
    };

    if (storedRefNode.state === NodeLifeCycle.FINALIZED) {
      // already attached, so the whole tree is ready
      startWatching(true);
    } else {
      if (!storedRefNode.isRoot) {
        // start watching once the whole tree is ready
        storedRefNode.root.registerHook(Hook.afterCreationFinalization, () => {
          // make sure to attach it so it can start listening
          if (storedRefNode.parent) {
            storedRefNode.parent.createObservableInstanceIfNeeded();
          }
        });
      }
      // start watching once the node is attached somewhere / parent changes
      storedRefNode.registerHook(Hook.afterAttach, () => {
        startWatching(false);
      });
    }
  }

  private addTargetNodeWatcher(storedRefNode: this['N'], referenceId: ReferenceIdentifier): IDisposer | undefined {
    // this will make sure the target node becomes created
    const refTargetValue = this.getValue(storedRefNode);

    if (!refTargetValue) {
      return undefined;
    }

    const refTargetNode = getStateTreeNode(refTargetValue);

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const hookHandler = (_: AnyNode, refTargetNodeHook: Hook) => {
      const cause = getInvalidationCause(refTargetNodeHook);

      if (!cause) {
        return;
      }

      this.fireInvalidated(cause, storedRefNode, referenceId, refTargetNode);
    };

    const refTargetDetachHookDisposer = refTargetNode.registerHook(Hook.beforeDetach, hookHandler);
    const refTargetDestroyHookDisposer = refTargetNode.registerHook(Hook.beforeDestroy, hookHandler);

    return () => {
      refTargetDetachHookDisposer();
      refTargetDestroyHookDisposer();
    };
  }

  // eslint-disable-next-line max-lines-per-function, @typescript-eslint/explicit-function-return-type
  private fireInvalidated(
    cause: 'detach' | 'destroy' | 'invalidSnapshotReference',
    storedRefNode: this['N'],
    referenceId: ReferenceIdentifier,
    refTargetNode: AnyObjectNode | null
  ) {
    // to actually invalidate a reference we need an alive parent,
    // since it is a scalar value (immutable-ish) and we need to change it
    // from the parent
    const storedRefParentNode = storedRefNode.parent;

    if (!storedRefParentNode || !storedRefParentNode.isAlive) {
      return;
    }

    const storedRefParentValue = storedRefParentNode.storedValue;

    if (!storedRefParentValue) {
      return;
    }

    this.onInvalidated!({
      cause,
      parent: storedRefParentValue,
      invalidTarget: refTargetNode ? refTargetNode.storedValue : undefined,
      invalidId: referenceId,
      replaceRef(newRef) {
        applyPatch(storedRefNode.root.storedValue, {
          op: 'replace',
          value: newRef,
          path: storedRefNode.path,
        });
      },
      removeRef() {
        if (isModelType(storedRefParentNode.type)) {
          this.replaceRef(undefined as any);
        } else {
          applyPatch(storedRefNode.root.storedValue, {
            op: 'remove',
            path: storedRefNode.path,
          });
        }
      },
    });
  }
}

export class IdentifierReferenceType<IT extends IAnyComplexType> extends BaseReferenceType<IT> {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(targetType: IT, onInvalidated?: OnReferenceInvalidated<ReferenceT<IT>>) {
    super(targetType, onInvalidated);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getSnapshot(storedRefNode: this['N']) {
    const ref: StoredReference<IT> = storedRefNode.storedValue;

    return ref.identifier;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getValue(storedRefNode: this['N']) {
    if (!storedRefNode.isAlive) return undefined;

    const storedRef: StoredReference<IT> = storedRefNode.storedValue;

    return storedRef.resolvedValue as any;
  }

  instantiate(
    parent: AnyObjectNode | null,
    subpath: string,
    environment: any,
    initialValue: this['C'] | this['T']
  ): this['N'] {
    const identifier = isStateTreeNode(initialValue) ? getIdentifier(initialValue)! : initialValue;
    const storedRef = new StoredReference(initialValue, this.targetType as any);
    const storedRefNode: this['N'] = super.instantiate(parent, subpath, environment, storedRef as any);

    storedRef.node = storedRefNode;
    this.watchTargetNodeForInvalidations(storedRefNode, identifier as string, undefined);

    return storedRefNode;
  }

  reconcile(current: this['N'], newValue: this['C'] | this['T'], parent: AnyObjectNode, subpath: string): this['N'] {
    if (!current.isDetaching && current.type === this) {
      const compareByValue = isStateTreeNode(newValue);
      const ref: StoredReference<IT> = current.storedValue;

      if ((!compareByValue && ref.identifier === newValue) || (compareByValue && ref.resolvedValue === newValue)) {
        current.setParent(parent, subpath);

        return current;
      }
    }

    const newNode = this.instantiate(parent, subpath, undefined, newValue);

    current.die(); // noop if detaching

    return newNode;
  }
}

export class CustomReferenceType<IT extends IAnyComplexType> extends BaseReferenceType<IT> {
  constructor(
    targetType: IT,
    // eslint-disable-next-line @typescript-eslint/no-parameter-properties
    private readonly options: ReferenceOptionsGetSet<IT>,
    onInvalidated?: OnReferenceInvalidated<ReferenceT<IT>>
  ) {
    super(targetType, onInvalidated);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getSnapshot(storedRefNode: this['N']) {
    return storedRefNode.storedValue;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getValue(storedRefNode: this['N']) {
    if (!storedRefNode.isAlive) return undefined as any;

    const referencedNode = this.options.get(
      storedRefNode.storedValue,
      storedRefNode.parent ? storedRefNode.parent.storedValue : null
    );

    return referencedNode;
  }

  instantiate(
    parent: AnyObjectNode | null,
    subpath: string,
    environment: any,
    newValue: this['C'] | this['T']
  ): this['N'] {
    const identifier = isStateTreeNode(newValue) ? this.options.set(newValue, parent?.storedValue ?? null) : newValue;
    const storedRefNode = super.instantiate(parent, subpath, environment, identifier as any);

    this.watchTargetNodeForInvalidations(storedRefNode, identifier as string, this.options);

    return storedRefNode;
  }

  reconcile(current: this['N'], newValue: this['C'] | this['T'], parent: AnyObjectNode, subpath: string): this['N'] {
    const newIdentifier = isStateTreeNode(newValue)
      ? this.options.set(newValue, current?.storedValue ?? null)
      : newValue;

    if (!current.isDetaching && current.type === this && current.storedValue === newIdentifier) {
      current.setParent(parent, subpath);

      return current;
    }

    const newNode = this.instantiate(parent, subpath, undefined, newIdentifier);

    current.die(); // noop if detaching

    return newNode;
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface ReferenceOptionsGetSet<IT extends IAnyComplexType> {
  get(identifier: ReferenceIdentifier, parent: IAnyStateTreeNode | null): ReferenceT<IT>;
  set(value: ReferenceT<IT>, parent: IAnyStateTreeNode | null): ReferenceIdentifier;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface ReferenceOptionsOnInvalidated<IT extends IAnyComplexType> {
  // called when the current reference is about to become invalid
  onInvalidated: OnReferenceInvalidated<ReferenceT<IT>>;
}

export type ReferenceOptions<IT extends IAnyComplexType> =
  | ReferenceOptionsGetSet<IT>
  | ReferenceOptionsOnInvalidated<IT>
  | (ReferenceOptionsGetSet<IT> & ReferenceOptionsOnInvalidated<IT>);

/** @hidden */
export interface IReferenceType<IT extends IAnyComplexType>
  extends IType<ReferenceIdentifier, ReferenceIdentifier, IT['TypeWithoutSTN']> {}

/**
 * `types.reference` - Creates a reference to another type, which should have defined an identifier.
 * See also the [reference and identifiers](https://github.com/mobxjs/mobx-state-tree#references-and-identifiers) section.
 */
export function reference<IT extends IAnyComplexType>(subType: IT, options?: ReferenceOptions<IT>): IReferenceType<IT> {
  assertIsType(subType, 1);

  if (DEV_MODE) {
    // eslint-disable-next-line prefer-rest-params
    if (arguments.length === 2 && typeof arguments[1] === 'string') {
      // istanbul ignore next
      throw fail('References with base path are no longer supported. Please remove the base path.');
    }
  }

  const getSetOptions = options ? (options as ReferenceOptionsGetSet<IT>) : undefined;
  const onInvalidated = options ? (options as ReferenceOptionsOnInvalidated<IT>).onInvalidated : undefined;

  if (getSetOptions && (getSetOptions.get || getSetOptions.set)) {
    if (DEV_MODE) {
      if (!getSetOptions.get || !getSetOptions.set) {
        throw fail("reference options must either contain both a 'get' and a 'set' method or none of them");
      }
    }

    return new CustomReferenceType(
      subType,
      {
        get: getSetOptions.get,
        set: getSetOptions.set,
      },
      onInvalidated
    );
  }

  return new IdentifierReferenceType(subType, onInvalidated);
}

/**
 * Returns if a given value represents a reference type.
 *
 * @param type
 * @returns
 */
export function isReferenceType<IT extends IReferenceType<any>>(type: IT): type is IT {
  return (type.flags & TypeFlags.Reference) > 0;
}

export function safeReference<IT extends IAnyComplexType>(
  subType: IT,
  // eslint-disable-next-line @typescript-eslint/ban-types
  options: (ReferenceOptionsGetSet<IT> | {}) & {
    acceptsUndefined: false;
    onInvalidated?: OnReferenceInvalidated<ReferenceT<IT>>;
  }
): IReferenceType<IT>;
export function safeReference<IT extends IAnyComplexType>(
  subType: IT,
  // eslint-disable-next-line @typescript-eslint/ban-types
  options?: (ReferenceOptionsGetSet<IT> | {}) & {
    acceptsUndefined?: boolean;
    onInvalidated?: OnReferenceInvalidated<ReferenceT<IT>>;
  }
): IMaybe<IReferenceType<IT>>;
/**
 * `types.safeReference` - A safe reference is like a standard reference, except that it accepts the undefined value by default
 * and automatically sets itself to undefined (when the parent is a model) / removes itself from arrays and maps
 * when the reference it is pointing to gets detached/destroyed.
 *
 * The optional options parameter object accepts a parameter named `acceptsUndefined`, which is set to true by default, so it is suitable
 * for model properties.
 * When used inside collections (arrays/maps), it is recommended to set this option to false so it can't take undefined as value,
 * which is usually the desired in those cases.
 * Additionally, the optional options parameter object accepts a parameter named `onInvalidated`, which will be called when the reference target node that the reference is pointing to is about to be detached/destroyed
 *
 * Strictly speaking it is a `types.maybe(types.reference(X))` (when `acceptsUndefined` is set to true, the default) and
 * `types.reference(X)` (when `acceptsUndefined` is set to false), both of them with a customized `onInvalidated` option.
 *
 * @param subType
 * @param options
 * @returns
 */
export function safeReference<IT extends IAnyComplexType>(
  subType: IT,
  // eslint-disable-next-line @typescript-eslint/ban-types
  options?: (ReferenceOptionsGetSet<IT> | {}) & {
    acceptsUndefined?: boolean;
    onInvalidated?: OnReferenceInvalidated<ReferenceT<IT>>;
  }
): IReferenceType<IT> | IMaybe<IReferenceType<IT>> {
  const refType = reference(subType, {
    ...options,
    onInvalidated(ev) {
      if (options && options.onInvalidated) {
        options.onInvalidated(ev);
      }
      ev.removeRef();
    },
  });

  if (options && options.acceptsUndefined === false) {
    return refType;
  }

  return maybe(refType);
}
