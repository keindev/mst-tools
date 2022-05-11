import { IAnyStateTreeNode, IMiddlewareEvent } from '../internal';
import { getCurrentActionContext } from './action';

export interface IActionContext {
  /** Event arguments in an array (action arguments for actions) */
  readonly args: any[];
  /** Event context (node where the action was invoked) */
  readonly context: IAnyStateTreeNode;
  /** Event unique id */
  readonly id: number;
  /** Event name (action name for actions) */
  readonly name: string;
  /** Parent action event object */
  readonly parentActionEvent: IMiddlewareEvent | undefined;
  /** Event tree (root node of the node where the action was invoked) */
  readonly tree: IAnyStateTreeNode;
}

/**
 * Returns the currently executing MST action context, or undefined if none.
 */
export function getRunningActionContext(): IActionContext | undefined {
  let current = getCurrentActionContext();

  while (current && current.type !== 'action') {
    current = current.parentActionEvent;
  }

  return current;
}

function _isActionContextThisOrChildOf(
  actionContext: IActionContext,
  sameOrParent: number | IActionContext | IMiddlewareEvent,
  includeSame: boolean
): boolean {
  const parentId = typeof sameOrParent === 'number' ? sameOrParent : sameOrParent.id;
  let current = includeSame ? actionContext : actionContext.parentActionEvent;

  while (current) {
    if (current.id === parentId) return true;

    current = current.parentActionEvent;
  }

  return false;
}

/** Returns if the given action context is a parent of this action context */
export function isActionContextChildOf(
  actionContext: IActionContext,
  parent: number | IActionContext | IMiddlewareEvent
): boolean {
  return _isActionContextThisOrChildOf(actionContext, parent, false);
}

/** Returns if the given action context is this or a parent of this action context */
export function isActionContextThisOrChildOf(
  actionContext: IActionContext,
  parentOrThis: number | IActionContext | IMiddlewareEvent
): boolean {
  return _isActionContextThisOrChildOf(actionContext, parentOrThis, true);
}
