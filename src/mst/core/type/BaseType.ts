/* eslint-disable @typescript-eslint/brace-style */
/* eslint-disable @typescript-eslint/indent */
import { action } from 'mobx';

import {
    AnyObjectNode, BaseNode, fail, getStateTreeNodeSafe, getType, IValidationContext, IValidationResult,
    typeCheckFailure, typecheckInternal, typeCheckSuccess,
} from '../../internal';
import { $type, cannotDetermineSubtype } from '../constants';
import { TypeFlags } from '../enums';
import { IAnyType, IType } from './Type';

/** A base type produces a MST node (Node in the state tree) */
export default abstract class BaseType<C, S, T, N extends BaseNode<any, any> = BaseNode<S, T>>
  implements IType<C, S, T>
{
  [$type]!: undefined;

  // these are just to make inner types available to inherited classes
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

  describe(): string {
    return this.name;
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

  abstract getSubTypes(): IAnyType[] | IAnyType | null | typeof cannotDetermineSubtype;
  abstract instantiate(parent: AnyObjectNode | null, subpath: string, environment: any, initialValue: C | T): N;
  abstract isValidSnapshot(value: C, context: IValidationContext): IValidationResult;
  abstract reconcile(current: N, newValue: C | T, parent: AnyObjectNode, subpath: string): N;
}

BaseType.prototype.create = action(BaseType.prototype.create);

export type AnyBaseType = BaseType<any, any, any, any>;
