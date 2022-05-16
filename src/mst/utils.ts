/* eslint-disable max-classes-per-file */
import { _getGlobalState, defineProperty as mobxDefineProperty, isObservableArray, isObservableObject } from 'mobx';

import { DEV_MODE } from './core/constants';
import { ModelPrimitive } from './internal';

const plainObjectString = Object.toString();

export const mobxShallow = _getGlobalState().useProxies ? { deep: false } : { deep: false, proxy: false };
Object.freeze(mobxShallow);

/** A generic disposer. */
export type IDisposer = () => void;

export function fail(message = 'Illegal state'): Error {
  return new Error('[mobx-state-tree] ' + message);
}

export function isArray(value: any): value is any[] {
  return Array.isArray(value) || isObservableArray(value);
}

export function asArray<T>(val: undefined | null | T | T[] | ReadonlyArray<T>): T[] {
  if (!val) return [];
  if (isArray(val)) return val;

  return [val] as T[];
}

export function extend<A, B>(a: A, b: B): A & B;
export function extend<A, B, C>(a: A, b: B, c: C): A & B & C;
export function extend<A, B, C, D>(a: A, b: B, c: C, d: D): A & B & C & D;
export function extend(a: any, ...b: any[]): any;
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function extend(a: any, ...b: any[]) {
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < b.length; i++) {
    const current = b[i];

    for (const key in current) a[key] = current[key];
  }

  return a;
}

export function isPlainObject(value: any): value is { [k: string]: any } {
  if (value === null || typeof value !== 'object') return false;

  const proto = Object.getPrototypeOf(value);

  if (proto === null) return true;

  return proto.constructor?.toString() === plainObjectString;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function isMutable(value: any) {
  return value !== null && typeof value === 'object' && !(value instanceof Date) && !(value instanceof RegExp);
}

export function isPrimitive(value: any, includeDate = true): value is ModelPrimitive | null | undefined {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (includeDate && value instanceof Date)
  );
}

/** Freeze a value and return it (if not in production) */
export function freeze<T>(value: T): T {
  if (!DEV_MODE) return value;

  return isPrimitive(value) || isObservableArray(value) ? value : Object.freeze(value);
}

/** Recursively freeze a value (if not in production) */
export function deepFreeze<T>(value: T): T {
  if (!DEV_MODE) return value;
  freeze(value);

  if (isPlainObject(value)) {
    Object.keys(value).forEach(propKey => {
      if (!isPrimitive((value as any)[propKey]) && !Object.isFrozen((value as any)[propKey])) {
        deepFreeze((value as any)[propKey]);
      }
    });
  }

  return value;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function defineProperty(object: any, key: PropertyKey, descriptor: PropertyDescriptor) {
  // eslint-disable-next-line no-unused-expressions
  isObservableObject(object)
    ? mobxDefineProperty(object, key, descriptor)
    : Object.defineProperty(object, key, descriptor);
}

export function defineHiddenProperty(object: any, propName: string, value: any, writable = false): void {
  defineProperty(object, propName, { enumerable: false, writable, configurable: true, value });
}

/**
 * @internal
 * @hidden
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

/**
 * @internal
 * @hidden
 */
// eslint-disable-next-line @typescript-eslint/ban-types
class EventHandler<F extends Function> {
  private handlers: F[] = [];

  get hasSubscribers(): boolean {
    return this.handlers.length > 0;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  clear() {
    this.handlers.length = 0;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  emit(...args: ArgumentTypes<F>) {
    // make a copy just in case it changes
    const handlers = this.handlers.slice();

    handlers.forEach(f => f(...args));
  }

  has(fn: F): boolean {
    return this.handlers.indexOf(fn) >= 0;
  }

  register(fn: F, atTheBeginning = false): IDisposer {
    if (atTheBeginning) {
      this.handlers.unshift(fn);
    } else {
      this.handlers.push(fn);
    }

    return () => {
      this.unregister(fn);
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  unregister(fn: F) {
    const index = this.handlers.indexOf(fn);

    if (index >= 0) {
      this.handlers.splice(index, 1);
    }
  }
}

/**
 * @internal
 * @hidden
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export class EventHandlers<E extends { [k: string]: Function }> {
  // eslint-disable-next-line @typescript-eslint/ban-types
  private eventHandlers?: { [k in keyof E]?: EventHandler<Function> };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  clear<N extends keyof E>(event: N) {
    if (this.eventHandlers) {
      delete this.eventHandlers[event];
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  clearAll() {
    this.eventHandlers = undefined;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  emit<N extends keyof E>(event: N, ...args: ArgumentTypes<E[N]>) {
    const handler = this.eventHandlers && this.eventHandlers[event];

    if (handler) {
      (handler!.emit as any)(...args);
    }
  }

  has<N extends keyof E>(event: N, fn: E[N]): boolean {
    const handler = this.eventHandlers && this.eventHandlers[event];

    return !!handler && handler!.has(fn);
  }

  hasSubscribers(event: keyof E): boolean {
    const handler = this.eventHandlers && this.eventHandlers[event];

    return !!handler && handler!.hasSubscribers;
  }

  register<N extends keyof E>(event: N, fn: E[N], atTheBeginning = false): IDisposer {
    if (!this.eventHandlers) {
      this.eventHandlers = {};
    }

    let handler = this.eventHandlers[event];

    if (!handler) {
      handler = this.eventHandlers[event] = new EventHandler();
    }

    return handler.register(fn, atTheBeginning);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  unregister<N extends keyof E>(event: N, fn: E[N]) {
    const handler = this.eventHandlers && this.eventHandlers[event];

    if (handler) {
      handler!.unregister(fn);
    }
  }
}

const prototypeHasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * @internal
 * @hidden
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/ban-types
export function hasOwnProperty(object: Object, propName: string) {
  return prototypeHasOwnProperty.call(object, propName);
}

/**
 * @internal
 * @hidden
 */
export function argsToArray(args: IArguments): any[] {
  const res = new Array(args.length);

  for (let i = 0; i < args.length; i++) res[i] = args[i];

  return res;
}

export function stringStartsWith(str: string, beginning: string): boolean {
  return str.indexOf(beginning) === 0;
}

/**
 * @internal
 * @hidden
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type DeprecatedFunction = Function & { ids?: { [id: string]: true } };

export const deprecated: DeprecatedFunction = function (id: string, message: string): void {
  // skip if running production
  if (!DEV_MODE) return;
  // warn if hasn't been warned before
  // eslint-disable-next-line no-prototype-builtins
  if (deprecated.ids && !deprecated.ids.hasOwnProperty(id)) {
    warnError('Deprecation warning: ' + message);
  }
  // mark as warned to avoid duplicate warn message
  if (deprecated.ids) deprecated.ids[id] = true;
};
deprecated.ids = {};

export function warnError(msg: string): void {
  console.warn(new Error(`[mobx-state-tree] ${msg}`));
}

export function isTypeCheckingEnabled(): boolean {
  return DEV_MODE || (typeof process !== 'undefined' && process.env && process.env.ENABLE_TYPE_CHECK === 'true');
}

export function assertArg<T>(
  value: T,
  fn: (value: T) => boolean,
  typeName: string,
  argNumber: number | number[]
): void {
  if (DEV_MODE) {
    if (!fn(value)) {
      throw fail(`expected ${typeName} as argument ${asArray(argNumber).join(' or ')}, got ${value} instead`);
    }
  }
}

/**
 * @internal
 * @hidden
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/ban-types
export function assertIsFunction(value: Function, argNumber: number | number[]) {
  assertArg(value, fn => typeof fn === 'function', 'function', argNumber);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function assertIsNumber(value: number, argNumber: number | number[], min?: number, max?: number) {
  assertArg(value, n => typeof n === 'number', 'number', argNumber);

  if (min !== undefined) assertArg(value, n => n >= min, `number greater than ${min}`, argNumber);
  if (max !== undefined) assertArg(value, n => n <= max, `number lesser than ${max}`, argNumber);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function assertIsString(value: string, argNumber: number | number[], canBeEmpty = true) {
  assertArg(value, s => typeof s === 'string', 'string', argNumber);

  if (!canBeEmpty) assertArg(value, s => s !== '', 'not empty string', argNumber);
}

export function setImmediateWithFallback(fn: (...args: any[]) => void): void {
  if (typeof queueMicrotask === 'function') queueMicrotask(fn);
  else if (typeof setImmediate === 'function') setImmediate(fn);
  else setTimeout(fn, 1);
}
