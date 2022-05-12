import SimpleType from '../core/type/SimpleType';
import {
    AnyNode, fail, identity, ISimpleType, isInteger, isPrimitive, isType, IType, IValidationContext, IValidationResult,
    typeCheckFailure, typeCheckSuccess, TypeFlags,
} from '../internal';

// TODO: implement CoreType using types.custom ?
/**
 * @internal
 * @hidden
 */
export class CoreType<C, S, T> extends SimpleType<C, S, T> {
  constructor(
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-parameter-properties
    readonly flags: TypeFlags,
    // eslint-disable-next-line @typescript-eslint/no-parameter-properties
    private readonly checker: (value: C) => boolean,
    // eslint-disable-next-line @typescript-eslint/no-parameter-properties
    private readonly initializer: (v: C) => T = identity
  ) {
    super(name);
    this.flags = flags;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  createNewInstance(snapshot: C) {
    return this.initializer(snapshot);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  describe() {
    return this.name;
  }

  isValidSnapshot(value: C, context: IValidationContext): IValidationResult {
    if (isPrimitive(value) && this.checker(value as any)) {
      return typeCheckSuccess();
    }

    const typeName = this.name === 'Date' ? 'Date or a unix milliseconds timestamp' : this.name;

    return typeCheckFailure(context, value, `Value is not a ${typeName}`);
  }
}

/**
 * `types.string` - Creates a type that can only contain a string value.
 * This type is used for string values by default
 *
 * Example:
 * ```ts
 * const Person = types.model('', {
 *   firstName: types.string,
 *   lastName: "Doe"
 * })
 * ```
 */
export const string: ISimpleType<string> = new CoreType<string, string, string>(
  'string',
  TypeFlags.String,
  v => typeof v === 'string'
);

/**
 * `types.number` - Creates a type that can only contain a numeric value.
 * This type is used for numeric values by default
 *
 * Example:
 * ```ts
 * const Vector = types.model('', {
 *   x: types.number,
 *   y: 1.5
 * })
 * ```
 */
export const number: ISimpleType<number> = new CoreType<number, number, number>(
  'number',
  TypeFlags.Number,
  v => typeof v === 'number'
);

/**
 * `types.integer` - Creates a type that can only contain an integer value.
 * This type is used for integer values by default
 *
 * Example:
 * ```ts
 * const Size = types.model('', {
 *   width: types.integer,
 *   height: 10
 * })
 * ```
 */
export const integer: ISimpleType<number> = new CoreType<number, number, number>('integer', TypeFlags.Integer, v =>
  isInteger(v)
);

/**
 * `types.boolean` - Creates a type that can only contain a boolean value.
 * This type is used for boolean values by default
 *
 * Example:
 * ```ts
 * const Thing = types.model('', {
 *   isCool: types.boolean,
 *   isAwesome: false
 * })
 * ```
 */
export const boolean: ISimpleType<boolean> = new CoreType<boolean, boolean, boolean>(
  'boolean',
  TypeFlags.Boolean,
  v => typeof v === 'boolean'
);

/**
 * `types.null` - The type of the value `null`
 */
export const nullType: ISimpleType<null> = new CoreType<null, null, null>('null', TypeFlags.Null, v => v === null);

/**
 * `types.undefined` - The type of the value `undefined`
 */
export const undefinedType: ISimpleType<undefined> = new CoreType<undefined, undefined, undefined>(
  'undefined',
  TypeFlags.Undefined,
  v => v === undefined
);

const _DatePrimitive = new CoreType<number | Date, number, Date>(
  'Date',
  TypeFlags.Date,
  v => typeof v === 'number' || v instanceof Date,
  v => (v instanceof Date ? v : new Date(v))
);
// eslint-disable-next-line padding-line-between-statements
_DatePrimitive.getSnapshot = function (node: AnyNode) {
  return node.storedValue.getTime();
};

/**
 * `types.Date` - Creates a type that can only contain a javascript Date value.
 *
 * Example:
 * ```ts
 * const LogLine = types.model('', {
 *   timestamp: types.Date,
 * })
 *
 * LogLine.create({ timestamp: new Date() })
 * ```
 */
export const DatePrimitive: IType<number | Date, number, Date> = _DatePrimitive;

/**
 * @internal
 * @hidden
 */
export function getPrimitiveFactoryFromValue(value: any): ISimpleType<any> {
  switch (typeof value) {
    case 'string':
      return string;
    case 'number':
      return number; // In the future, isInteger(value) ? integer : number would be interesting, but would be too breaking for now
    case 'boolean':
      return boolean;
    case 'object':
      if (value instanceof Date) return DatePrimitive;
  }
  throw fail('Cannot determine primitive type from value ' + value);
}

/**
 * Returns if a given value represents a primitive type.
 *
 * @param type
 * @returns
 */
export function isPrimitiveType<
  IT extends ISimpleType<string> | ISimpleType<number> | ISimpleType<boolean> | typeof DatePrimitive
>(type: IT): type is IT {
  return (
    isType(type) &&
    (type.flags & (TypeFlags.String | TypeFlags.Number | TypeFlags.Integer | TypeFlags.Boolean | TypeFlags.Date)) > 0
  );
}
