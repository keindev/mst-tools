/* eslint-disable @typescript-eslint/indent */
/* eslint-disable max-classes-per-file */
import {
    _interceptReads, action, IInterceptor, IKeyValueMap, IMapDidChange, IMapWillChange, intercept, Lambda, observable,
    ObservableMap, observe, values,
} from 'mobx';

import { cannotDetermineSubtype } from '../../core/constants';
import { TypeFlags } from '../../core/enums';
import ComplexType from '../../core/type/ComplexType';
import { IAnyType, IType } from '../../core/type/Type';
import { ExtractCSTWithSTN, isType } from '../../core/type/type-utils';
import {
    addHiddenFinalProp, addHiddenWritableProp, AnyNode, AnyObjectNode, asArray, createActionInvoker, devMode,
    EMPTY_OBJECT, escapeJsonPath, fail, flattenTypeErrors, getContextForPath, getSnapshot, getStateTreeNode,
    IAnyModelType, IAnyStateTreeNode, IChildNodesMap, IHooksGetter, IJsonPatch, isMutable, isPlainObject,
    isStateTreeNode, isValidIdentifier, IValidationContext, IValidationResult, ModelType, normalizeIdentifier,
    ObjectNode, typeCheckFailure, typecheckInternal,
} from '../../internal';

export interface IMapType<IT extends IAnyType>
  extends IType<IKeyValueMap<IT['CreationType']> | undefined, IKeyValueMap<IT['SnapshotType']>, IMSTMap<IT>> {
  hooks(hooks: IHooksGetter<IMSTMap<IT>>): IMapType<IT>;
}

export interface IMSTMap<IT extends IAnyType> {
  [Symbol.toStringTag]: 'Map';
  // bases on ObservableMap, but fine tuned to the auto snapshot conversion of MST
  readonly size: number;
  [Symbol.iterator](): IterableIterator<[string, IT['Type']]>;

  clear(): void;
  delete(key: string): boolean;
  entries(): IterableIterator<[string, IT['Type']]>;
  forEach(callbackfn: (value: IT['Type'], key: string, map: this) => void, thisArg?: any): void;
  get(key: string): IT['Type'] | undefined;
  has(key: string): boolean;
  intercept(handler: IInterceptor<IMapWillChange<string, IT['Type']>>): Lambda;
  keys(): IterableIterator<string>;
  /** Merge another object into this map, returns self. */
  merge(other: IMSTMap<IType<any, any, IT['TypeWithoutSTN']>> | IKeyValueMap<ExtractCSTWithSTN<IT>> | any): this;
  /**
   * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
   * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
   * for callback details
   */
  observe(listener: (changes: IMapDidChange<string, IT['Type']>) => void, fireImmediately?: boolean): Lambda;
  put(value: ExtractCSTWithSTN<IT>): IT['Type'];
  replace(values: IMSTMap<IType<any, any, IT['TypeWithoutSTN']>> | IKeyValueMap<ExtractCSTWithSTN<IT>> | any): this;
  set(key: string, value: ExtractCSTWithSTN<IT>): this;
  toJSON(): IKeyValueMap<IT['SnapshotType']>;
  toString(): string;
  values(): IterableIterator<IT['Type']>;
}

const needsIdentifierError = 'Map.put can only be used to store complex values that have an identifier type attribute';

function tryCollectModelTypes(type: IAnyType, modelTypes: Array<IAnyModelType>): boolean {
  const subtypes = type.getSubTypes();

  if (subtypes === cannotDetermineSubtype) return false;
  if (subtypes) {
    const subtypesArray = asArray(subtypes);

    for (const subtype of subtypesArray) {
      if (!tryCollectModelTypes(subtype, modelTypes)) return false;
    }
  }

  if (type instanceof ModelType) modelTypes.push(type);

  return true;
}

export enum MapIdentifierMode {
  UNKNOWN,
  YES,
  NO,
}

class MSTMap<IT extends IAnyType> extends ObservableMap<string, any> {
  constructor(initialData?: [string, any][] | IKeyValueMap<any> | Map<string, any> | undefined) {
    super(initialData, (observable.ref as any).enhancer);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  delete(key: string) {
    return super.delete('' + key);
  }

  get(key: string): IT['Type'] | undefined {
    // maybe this is over-enthousiastic? normalize numeric keys to strings
    return super.get('' + key);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  has(key: string) {
    return super.has('' + key);
  }

  // eslint-disable-next-line max-lines-per-function
  put(value: ExtractCSTWithSTN<IT>): IT['Type'] {
    if (!value) throw fail('Map.put cannot be used to set empty values');
    if (isStateTreeNode(value)) {
      const node = getStateTreeNode(value);

      if (devMode()) {
        if (!node.identifierAttribute) throw fail(needsIdentifierError);
      }

      if (node.identifier === null) throw fail(needsIdentifierError);

      this.set(node.identifier, value);

      return value as any;
      // eslint-disable-next-line no-else-return
    } else if (!isMutable(value)) {
      throw fail('Map.put can only be used to store complex values');
    } else {
      const mapNode = getStateTreeNode(this as IAnyStateTreeNode);
      const mapType = mapNode.type as MapType<any>;

      if (mapType.identifierMode !== MapIdentifierMode.YES) throw fail(needsIdentifierError);

      const idAttr = mapType.mapIdentifierAttribute!;
      const id = (value as any)[idAttr];

      if (!isValidIdentifier(id)) {
        // try again but this time after creating a node for the value
        // since it might be an optional identifier
        const newNode = this.put(mapType.getChildType().create(value, mapNode.environment));

        return this.put(getSnapshot(newNode));
      }

      const key = normalizeIdentifier(id);

      this.set(key, value);

      return this.get(key) as any;
    }
  }

  set(key: string, value: ExtractCSTWithSTN<IT>): this {
    return super.set('' + key, value);
  }
}

export class MapType<IT extends IAnyType> extends ComplexType<
  IKeyValueMap<IT['CreationType']> | undefined,
  IKeyValueMap<IT['SnapshotType']>,
  IMSTMap<IT>
> {
  identifierMode: MapIdentifierMode = MapIdentifierMode.UNKNOWN;
  mapIdentifierAttribute: string | undefined = undefined;
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly flags = TypeFlags.Map;

  private readonly hookInitializers: Array<IHooksGetter<IMSTMap<IT>>> = [];

  constructor(
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-parameter-properties
    private readonly _subType: IAnyType,
    hookInitializers: Array<IHooksGetter<IMSTMap<IT>>> = []
  ) {
    super(name);
    this._determineIdentifierMode();
    this.hookInitializers = hookInitializers;
  }

  applyPatchLocally(node: this['N'], subpath: string, patch: IJsonPatch): void {
    const target = node.storedValue;

    switch (patch.op) {
      case 'add':
      case 'replace':
        target.set(subpath, patch.value);
        break;
      case 'remove':
        target.delete(subpath);
        break;
    }
  }

  applySnapshot(node: this['N'], snapshot: this['C']): void {
    typecheckInternal(this, snapshot);
    const target = node.storedValue;
    const currentKeys: { [key: string]: boolean } = {};

    Array.from(target.keys()).forEach(key => {
      currentKeys[key] = false;
    });

    if (snapshot) {
      // Don't use target.replace, as it will throw away all existing items first
      for (const key in snapshot) {
        target.set(key, snapshot[key]);
        currentKeys['' + key] = true;
      }
    }
    Object.keys(currentKeys).forEach(key => {
      if (currentKeys[key] === false) target.delete(key);
    });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  describe() {
    return 'Map<string, ' + this._subType.describe() + '>';
  }

  // eslint-disable-next-line max-lines-per-function
  didChange(change: IMapDidChange<string, AnyNode>): void {
    const node = getStateTreeNode(change.object as IAnyStateTreeNode);

    switch (change.type) {
      case 'update':
        return void node.emitPatch(
          {
            op: 'replace',
            path: escapeJsonPath(change.name),
            value: change.newValue.snapshot,
            oldValue: change.oldValue ? change.oldValue.snapshot : undefined,
          },
          node
        );
      case 'add':
        return void node.emitPatch(
          {
            op: 'add',
            path: escapeJsonPath(change.name),
            value: change.newValue.snapshot,
            oldValue: undefined,
          },
          node
        );
      case 'delete':
        // a node got deleted, get the old snapshot and make the node die
        // eslint-disable-next-line no-case-declarations
        const oldSnapshot = change.oldValue.snapshot;

        change.oldValue.die();

        // emit the patch
        return void node.emitPatch(
          {
            op: 'remove',
            path: escapeJsonPath(change.name),
            oldValue: oldSnapshot,
          },
          node
        );
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  hooks(hooks: IHooksGetter<IMSTMap<IT>>) {
    const hookInitializers = this.hookInitializers.length > 0 ? this.hookInitializers.concat(hooks) : [hooks];

    return new MapType(this.name, this._subType, hookInitializers);
  }

  instantiate(
    parent: AnyObjectNode | null,
    subpath: string,
    environment: any,
    initialValue: this['C'] | this['T']
  ): this['N'] {
    this._determineIdentifierMode();

    return super.instantiate(parent, subpath, environment, initialValue);
  }

  initializeChildNodes(objNode: this['N'], initialSnapshot: this['C'] = {}): IChildNodesMap {
    const subType = (objNode.type as this)._subType;
    const result: IChildNodesMap = {};

    Object.keys(initialSnapshot).forEach(name => {
      result[name] = subType.instantiate(objNode, name, undefined, initialSnapshot[name]);
    });

    return result;
  }

  createNewInstance(childNodes: IChildNodesMap): this['T'] {
    return new MSTMap(childNodes) as any;
  }

  finalizeNewInstance(node: this['N'], instance: ObservableMap<string, any>): void {
    _interceptReads(instance, node.unbox);

    const type = node.type as this;

    type.hookInitializers.forEach(initializer => {
      const hooks = initializer(instance as unknown as IMSTMap<IT>);

      Object.keys(hooks).forEach(name => {
        const hook = hooks[name as keyof typeof hooks]!;
        const actionInvoker = createActionInvoker(instance as IAnyStateTreeNode, name, hook);

        (!devMode() ? addHiddenFinalProp : addHiddenWritableProp)(instance, name, actionInvoker);
      });
    });

    intercept(instance, this.willChange);
    observe(instance, this.didChange);
  }

  getChildren(node: this['N']): ReadonlyArray<AnyNode> {
    // return (node.storedValue as ObservableMap<any>).values()
    return values(node.storedValue);
  }

  getChildNode(node: this['N'], key: string): AnyNode {
    const childNode = node.storedValue.get('' + key);

    if (!childNode) throw fail('Not a child ' + key);

    return childNode;
  }

  getChildType(): IAnyType {
    return this._subType;
  }

  getDefaultSnapshot(): this['C'] {
    return EMPTY_OBJECT as this['C'];
  }

  getSnapshot(node: this['N']): this['S'] {
    return Object.fromEntries(node.getChildren().map(({ subpath, snapshot }) => [subpath, snapshot]));
  }

  processInitialSnapshot(childNodes: IChildNodesMap): this['S'] {
    return Object.fromEntries(Object.entries(childNodes).map(([key, value]) => [key, value.getSnapshot()]));
  }

  removeChild(node: this['N'], subpath: string): void {
    node.storedValue.delete(subpath);
  }

  isValidSnapshot(value: this['C'], context: IValidationContext): IValidationResult {
    if (!isPlainObject(value)) return typeCheckFailure(context, value, 'Value is not a plain object');

    return flattenTypeErrors(
      Object.keys(value).map(path =>
        this._subType.validate(value[path], getContextForPath(context, path, this._subType))
      )
    );
  }

  willChange(change: IMapWillChange<string, AnyNode>): IMapWillChange<string, AnyNode> | null {
    const node = getStateTreeNode(change.object as IAnyStateTreeNode);
    const key = change.name;

    node.assertWritable({ subpath: key });

    const mapType = node.type as this;
    const subType = mapType._subType;

    switch (change.type) {
      case 'update':
        // eslint-disable-next-line no-case-declarations
        const { newValue } = change;
        // eslint-disable-next-line no-case-declarations
        const oldValue = change.object.get(key);

        if (newValue === oldValue) return null;

        typecheckInternal(subType, newValue);
        change.newValue = subType.reconcile(node.getChildNode(key), change.newValue, node, key);
        mapType.processIdentifier(key, change.newValue);
        break;
      case 'add':
        typecheckInternal(subType, change.newValue);
        change.newValue = subType.instantiate(node, key, undefined, change.newValue);
        mapType.processIdentifier(key, change.newValue);
        break;
    }

    return change;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private _determineIdentifierMode() {
    if (this.identifierMode !== MapIdentifierMode.UNKNOWN) return;

    const modelTypes: IAnyModelType[] = [];

    if (tryCollectModelTypes(this._subType, modelTypes)) {
      const identifierAttribute: string | undefined = modelTypes.reduce(
        (current: IAnyModelType['identifierAttribute'], type) => {
          if (!type.identifierAttribute) return current;
          if (current && current !== type.identifierAttribute) {
            throw fail(
              // eslint-disable-next-line max-len
              `The objects in a map should all have the same identifier attribute, expected '${current}', but child of type '${type.name}' declared attribute '${type.identifierAttribute}' as identifier`
            );
          }

          return type.identifierAttribute;
        },
        undefined as IAnyModelType['identifierAttribute']
      );

      if (identifierAttribute) {
        this.identifierMode = MapIdentifierMode.YES;
        this.mapIdentifierAttribute = identifierAttribute;
      } else {
        this.identifierMode = MapIdentifierMode.NO;
      }
    }
  }

  private processIdentifier(expected: string, node: AnyNode): void {
    if (this.identifierMode === MapIdentifierMode.YES && node instanceof ObjectNode) {
      const { identifier } = node;

      if (identifier !== expected) {
        throw fail(
          // eslint-disable-next-line max-len
          `A map of objects containing an identifier should always store the object under their own identifier. Trying to store key '${identifier}', but expected: '${expected}'`
        );
      }
    }
  }
}

MapType.prototype.applySnapshot = action(MapType.prototype.applySnapshot);

/**
 * `types.map` - Creates a key based collection type who's children are all of a uniform declared type.
 * If the type stored in a map has an identifier, it is mandatory to store the child under that identifier in the map.
 *
 * This type will always produce [observable maps](https://mobx.js.org/api.html#observablemap)
 *
 * Example:
 * ```ts
 * const Todo = types.model('', {
 *   id: types.identifier,
 *   task: types.string
 * })
 *
 * const TodoStore = types.model('', {
 *   todos: types.map(Todo)
 * })
 *
 * const s = TodoStore.create({ todos: {} })
 * unprotect(s)
 * s.todos.set(17, { task: "Grab coffee", id: 17 })
 * s.todos.put({ task: "Grab cookie", id: 18 }) // put will infer key from the identifier
 * console.log(s.todos.get(17).task) // prints: "Grab coffee"
 * ```
 *
 * @param subtype
 * @returns
 */
export function map<IT extends IAnyType>(subtype: IT): IMapType<IT> {
  return new MapType<IT>(`map<string, ${subtype.name}>`, subtype);
}

/**
 * Returns if a given value represents a map type.
 *
 * @param type
 * @returns `true` if it is a map type.
 */
export function isMapType<Items extends IAnyType = IAnyType>(type: IAnyType): type is IMapType<Items> {
  return isType(type) && (type.flags & TypeFlags.Map) > 0;
}
