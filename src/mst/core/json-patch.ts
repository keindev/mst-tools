import { fail, stringStartsWith } from '../internal';

/**
 * https://tools.ietf.org/html/rfc6902
 * http://jsonpatch.com/
 */
export interface IJsonPatch {
  readonly op: 'replace' | 'add' | 'remove';
  readonly path: string;
  readonly value?: any;
}

export interface IReversibleJsonPatch extends IJsonPatch {
  readonly oldValue: any; // This goes beyond JSON-patch, but makes sure each patch can be inverse applied
}

export function splitPatch(patch: IReversibleJsonPatch): [IJsonPatch, IJsonPatch] {
  if (!('oldValue' in patch)) throw fail('Patches without `oldValue` field cannot be inverted');

  return [stripPatch(patch), invertPatch(patch)];
}

export function stripPatch({ op, path, value }: IReversibleJsonPatch): IJsonPatch {
  // strips `oldValue` information from the patch, so that it becomes a patch conform the json-patch spec
  // this removes the ability to undo the patch
  return {
    add: { op, path, value },
    remove: { op, path },
    replace: { op, path, value },
  }[op];
}

function invertPatch({ op, path, oldValue: value }: IReversibleJsonPatch): IJsonPatch {
  return (
    {
      add: { op: 'remove', path },
      remove: { op: 'add', path, value },
      replace: { op, path, value },
    } as { [key in IJsonPatch['op']]: IJsonPatch }
  )[op];
}

/**
 * Simple simple check to check it is a number.
 */
function isNumber(x: string): boolean {
  return typeof x === 'number';
}

/**
 * Escape slashes and backslashes.
 *
 * http://tools.ietf.org/html/rfc6901
 */
export function escapeJsonPath(path: string): string {
  if (isNumber(path) === true) return '' + path;
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  if (path.indexOf('/') === -1 && path.indexOf('~') === -1) return path;

  return path.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** Unescape slashes and backslashes. */
export function unescapeJsonPath(path: string): string {
  return path.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Generates a json-path compliant json path from path parts. */
export function joinJsonPath(path: string[]): string {
  // `/` refers to property with an empty name, while `` refers to root itself!
  if (path.length === 0) return '';

  const getPathStr = (p: string[]): string => p.map(escapeJsonPath).join('/');

  // relative
  if (path[0] === '.' || path[0] === '..') return getPathStr(path);

  // absolute
  return '/' + getPathStr(path);
}

/** Splits and decodes a json path into several parts. */
export function splitJsonPath(path: string): string[] {
  // `/` refers to property with an empty name, while `` refers to root itself!
  const parts = path.split('/').map(unescapeJsonPath);
  const valid =
    path === '' ||
    path === '.' ||
    path === '..' ||
    stringStartsWith(path, '/') ||
    stringStartsWith(path, './') ||
    stringStartsWith(path, '../');

  if (!valid) throw fail(`a json path must be either rooted, empty or relative, but got '${path}'`);
  // '/a/b/c' -> ["a", "b", "c"]
  // '../../b/c' -> ["..", "..", "b", "c"]
  // '' -> []
  // '/' -> ['']
  // './a' -> [".", "a"]
  // /./a' -> [".", "a"] equivalent to './a'
  if (parts[0] === '') parts.shift();

  return parts;
}
