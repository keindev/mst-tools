import { action as mobxAction } from 'mobx';

import {
    AnyObjectNode, argsToArray, fail, getRoot, getStateTreeNode, Hook, IActionContext, IAnyStateTreeNode, IDisposer,
    warnError,
} from '../internal';
import { DEV_MODE } from './constants';

export type IMiddlewareEventType =
  | 'action'
  | 'flow_spawn'
  | 'flow_resume'
  | 'flow_resume_error'
  | 'flow_return'
  | 'flow_throw';
// | "task_spawn TODO, see #273"

export interface IMiddlewareEvent extends IActionContext {
  /** Id of all events, from root until current (excluding current) */
  readonly allParentIds: number[];
  /** Parent event object */
  readonly parentEvent: IMiddlewareEvent | undefined;
  /** Parent event unique id */
  readonly parentId: number;
  /** Root event unique id */
  readonly rootId: number;
  /** Event type */
  readonly type: IMiddlewareEventType;
}

export type IMiddleware = {
  handler: IMiddlewareHandler;
  includeHooks: boolean;
};

export type IMiddlewareHandler = (
  actionCall: IMiddlewareEvent,
  next: (actionCall: IMiddlewareEvent, callback?: (value: any) => any) => void,
  abort: (value: any) => void
) => any;

let nextActionId = 1;
let currentActionContext: IMiddlewareEvent | undefined;

export function getCurrentActionContext(): IMiddlewareEvent | undefined {
  return currentActionContext;
}

export function getNextActionId(): number {
  return nextActionId++;
}

// TODO: optimize away entire action context if there is no middleware in tree?
// eslint-disable-next-line @typescript-eslint/ban-types
export function runWithActionContext(context: IMiddlewareEvent, fn: Function): void {
  const node = getStateTreeNode(context.context);

  if (context.type === 'action') {
    node.assertAlive({
      actionContext: context,
    });
  }

  const baseIsRunningAction = node._isRunningAction;

  node._isRunningAction = true;

  const previousContext = currentActionContext;

  currentActionContext = context;

  try {
    return runMiddleWares(node, context, fn);
  } finally {
    currentActionContext = previousContext;
    node._isRunningAction = baseIsRunningAction;
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/ban-types
export function createActionInvoker<T extends Function>(target: IAnyStateTreeNode, name: string, fn: T) {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const res = function () {
    const id = getNextActionId();
    const parentContext = currentActionContext;
    const parentActionContext = parentContext?.type === 'action' ? parentContext : parentContext?.parentActionEvent;

    return runWithActionContext(
      {
        type: 'action',
        name,
        id,
        // eslint-disable-next-line prefer-rest-params
        args: argsToArray(arguments),
        context: target,
        tree: getRoot(target),
        rootId: parentContext ? parentContext.rootId : id,
        parentId: parentContext ? parentContext.id : 0,
        allParentIds: parentContext ? [...parentContext.allParentIds, parentContext.id] : [],
        parentEvent: parentContext,
        parentActionEvent: parentActionContext,
      },
      fn
    );
  };

  (res as any)._isMSTAction = true;

  return res;
}

/**
 * Middleware can be used to intercept any action is invoked on the subtree where it is attached.
 * If a tree is protected (by default), this means that any mutation of the tree will pass through your middleware.
 *
 * For more details, see the [middleware docs](concepts/middleware.md)
 *
 * @param target Node to apply the middleware to.
 * @param middleware Middleware to apply.
 * @returns A callable function to dispose the middleware.
 */
export function addMiddleware(target: IAnyStateTreeNode, handler: IMiddlewareHandler, includeHooks = true): IDisposer {
  const node = getStateTreeNode(target);

  if (DEV_MODE) {
    if (!node.isProtectionEnabled) {
      warnError(
        // eslint-disable-next-line max-len
        'It is recommended to protect the state tree before attaching action middleware, as otherwise it cannot be guaranteed that all changes are passed through middleware. See `protect`'
      );
    }
  }

  return node.addMiddleWare(handler, includeHooks);
}

/**
 * Binds middleware to a specific action.
 *
 * Example:
 * ```ts
 * type.actions(self => {
 *   function takeA____() {
 *       self.toilet.donate()
 *       self.wipe()
 *       self.wipe()
 *       self.toilet.flush()
 *   }
 *   return {
 *     takeA____: decorate(atomic, takeA____)
 *   }
 * })
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function decorate<T extends Function>(handler: IMiddlewareHandler, fn: T, includeHooks = true): T {
  const middleware: IMiddleware = { handler, includeHooks };

  (fn as any).$mst_middleware = (fn as any).$mst_middleware || [];
  (fn as any).$mst_middleware.push(middleware);

  return fn;
}

class CollectedMiddlewares {
  private arrayIndex = 0;
  private inArrayIndex = 0;
  private readonly middlewares: IMiddleware[][] = [];

  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor(node: AnyObjectNode, fn: Function) {
    // we just push middleware arrays into an array of arrays to avoid making copies
    if ((fn as any).$mst_middleware) {
      this.middlewares.push((fn as any).$mst_middleware);
    }

    let n: AnyObjectNode | null = node;

    // Find all middlewares. Optimization: cache this?
    while (n) {
      if (n.middlewares) this.middlewares.push(n.middlewares);
      n = n.parent;
    }
  }

  get isEmpty(): boolean {
    return this.middlewares.length <= 0;
  }

  getNextMiddleware(): IMiddleware | undefined {
    const array = this.middlewares[this.arrayIndex];

    if (!array) return undefined;

    const item = array[this.inArrayIndex++];

    if (!item) {
      this.arrayIndex++;
      this.inArrayIndex = 0;

      return this.getNextMiddleware();
    }

    return item;
  }
}

// eslint-disable-next-line max-lines-per-function, @typescript-eslint/ban-types
function runMiddleWares(node: AnyObjectNode, baseCall: IMiddlewareEvent, originalFn: Function): any {
  const middlewares = new CollectedMiddlewares(node, originalFn);

  // Short circuit
  // eslint-disable-next-line prefer-spread
  if (middlewares.isEmpty) return mobxAction(originalFn).apply(null, baseCall.args);

  let result: any = null;

  // eslint-disable-next-line max-lines-per-function
  function runNextMiddleware(call: IMiddlewareEvent): any {
    const middleware = middlewares.getNextMiddleware();
    const handler = middleware && middleware.handler;

    if (!handler) {
      // eslint-disable-next-line prefer-spread
      return mobxAction(originalFn).apply(null, call.args);
    }

    // skip hooks if asked to
    if (!middleware?.includeHooks && (Hook as any)[call.name]) {
      return runNextMiddleware(call);
    }

    let nextInvoked = false;

    function next(call2: IMiddlewareEvent, callback?: (value: any) => any): void {
      nextInvoked = true;
      // the result can contain
      // - the non manipulated return value from an action
      // - the non manipulated abort value
      // - one of the above but manipulated through the callback function
      result = runNextMiddleware(call2);

      if (callback) {
        result = callback(result);
      }
    }

    let abortInvoked = false;

    function abort(value: any): void {
      abortInvoked = true;
      // overwrite the result
      // can be manipulated through middlewares earlier in the queue using the callback fn
      result = value;
    }

    handler(call, next, abort);

    if (DEV_MODE) {
      if (!nextInvoked && !abortInvoked) {
        const node2 = getStateTreeNode(call.tree);

        throw fail(
          // eslint-disable-next-line max-len
          `Neither the next() nor the abort() callback within the middleware ${handler.name} for the action: "${call.name}" on the node: ${node2.type.name} was invoked.`
        );
      } else if (nextInvoked && abortInvoked) {
        const node2 = getStateTreeNode(call.tree);

        throw fail(
          // eslint-disable-next-line max-len
          `The next() and abort() callback within the middleware ${handler.name} for the action: "${call.name}" on the node: ${node2.type.name} were invoked.`
        );
      }
    }

    return result;
  }

  return runNextMiddleware(baseCall);
}
