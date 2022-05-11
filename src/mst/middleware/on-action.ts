import { runInAction } from 'mobx';

import {
    addMiddleware, AnyNode, applyPatch, applySnapshot, asArray, assertArg, assertIsStateTreeNode, devMode, fail,
    getRelativePathBetweenNodes, getRunningActionContext, getStateTreeNode, getType, IActionContext, IAnyStateTreeNode,
    IDisposer, isArray, isPlainObject, isPrimitive, isProtected, isRoot, isStateTreeNode, tryResolve, warnError,
} from '../internal';

export interface ISerializedActionCall {
  args?: any[];
  name: string;
  path?: string;
}

export interface IActionRecorder {
  actions: ReadonlyArray<ISerializedActionCall>;
  readonly recording: boolean;
  replay(target: IAnyStateTreeNode): void;
  resume(): void;
  stop(): void;
}

function serializeArgument(_node: AnyNode, _actionName: string, _index: number, arg: any): any {
  if (arg instanceof Date) return { $MST_DATE: arg.getTime() };
  if (isPrimitive(arg)) return arg;
  // We should not serialize MST nodes, even if we can, because we don't know if the receiving party can handle a raw snapshot instead of an
  // MST type instance. So if one wants to serialize a MST node that was pass in, either explitly pass: 1: an id, 2: a (relative) path, 3: a snapshot
  if (isStateTreeNode(arg)) return serializeTheUnserializable(`[MSTNode: ${getType(arg).name}]`);
  if (typeof arg === 'function') return serializeTheUnserializable(`[function]`);
  if (typeof arg === 'object' && !isPlainObject(arg) && !isArray(arg)) {
    return serializeTheUnserializable(
      `[object ${(arg && (arg as any).constructor && (arg as any).constructor.name) || 'Complex Object'}]`
    );
  }

  try {
    // Check if serializable, cycle free etc...
    // MWE: there must be a better way....
    JSON.stringify(arg); // or throws

    return arg;
  } catch (e) {
    return serializeTheUnserializable('' + e);
  }
}

function deserializeArgument(_adm: AnyNode, value: any): any {
  if (value && typeof value === 'object' && '$MST_DATE' in value) return new Date(value['$MST_DATE']);

  return value;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function serializeTheUnserializable(baseType: string) {
  return {
    $MST_UNSERIALIZABLE: true,
    type: baseType,
  };
}

/**
 * Applies an action or a series of actions in a single MobX transaction.
 * Does not return any value
 * Takes an action description as produced by the `onAction` middleware.
 *
 * @param target
 * @param actions
 */
export function applyAction(target: IAnyStateTreeNode, actions: ISerializedActionCall | ISerializedActionCall[]): void {
  // check all arguments
  assertIsStateTreeNode(target, 1);
  assertArg(actions, a => typeof a === 'object', 'object or array', 2);

  runInAction(() => {
    asArray(actions).forEach(action => baseApplyAction(target, action));
  });
}

function baseApplyAction(target: IAnyStateTreeNode, action: ISerializedActionCall): any {
  const resolvedTarget = tryResolve(target, action.path || '');

  if (!resolvedTarget) throw fail(`Invalid action path: ${action.path || ''}`);

  const node = getStateTreeNode(resolvedTarget);

  // Reserved functions
  if (action.name === '@APPLY_PATCHES') {
    // eslint-disable-next-line no-useless-call
    return applyPatch.call(null, resolvedTarget, action.args![0]);
  }

  if (action.name === '@APPLY_SNAPSHOT') {
    // eslint-disable-next-line no-useless-call
    return applySnapshot.call(null, resolvedTarget, action.args![0]);
  }

  if (!(typeof resolvedTarget[action.name] === 'function')) {
    throw fail(`Action '${action.name}' does not exist in '${node.path}'`);
  }

  // eslint-disable-next-line prefer-spread
  return resolvedTarget[action.name].apply(
    resolvedTarget,
    action.args ? action.args.map(v => deserializeArgument(node, v)) : []
  );
}

/**
 * Small abstraction around `onAction` and `applyAction`, attaches an action listener to a tree and records all the actions emitted.
 * Returns an recorder object with the following signature:
 *
 * Example:
 * ```ts
 * export interface IActionRecorder {
 *      // the recorded actions
 *      actions: ISerializedActionCall[]
 *      // true if currently recording
 *      recording: boolean
 *      // stop recording actions
 *      stop(): void
 *      // resume recording actions
 *      resume(): void
 *      // apply all the recorded actions on the given object
 *      replay(target: IAnyStateTreeNode): void
 * }
 * ```
 *
 * The optional filter function allows to skip recording certain actions.
 *
 * @param subject
 * @returns
 */
// eslint-disable-next-line max-lines-per-function
export function recordActions(
  subject: IAnyStateTreeNode,
  filter?: (action: ISerializedActionCall, actionContext: IActionContext | undefined) => boolean
): IActionRecorder {
  // check all arguments
  assertIsStateTreeNode(subject, 1);

  const actions: ISerializedActionCall[] = [];
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const listener = (call: ISerializedActionCall) => {
    const recordThis = filter ? filter(call, getRunningActionContext()) : true;

    if (recordThis) actions.push(call);
  };

  let disposer: IDisposer | undefined;
  const recorder: IActionRecorder = {
    actions,
    get recording() {
      return !!disposer;
    },
    stop() {
      if (disposer) {
        disposer();
        disposer = undefined;
      }
    },
    resume() {
      if (disposer) return;
      disposer = onAction(subject, listener);
    },
    replay(target) {
      applyAction(target, actions);
    },
  };

  recorder.resume();

  return recorder;
}

/**
 * Registers a function that will be invoked for each action that is called on the provided model instance, or to any of its children.
 * See [actions](https://github.com/mobxjs/mobx-state-tree#actions) for more details. onAction events are emitted only for the outermost called action in the stack.
 * Action can also be intercepted by middleware using addMiddleware to change the function call before it will be run.
 *
 * Not all action arguments might be serializable. For unserializable arguments, a struct like `{ $MST_UNSERIALIZABLE: true, type: "someType" }` will be generated.
 * MST Nodes are considered non-serializable as well (they could be serialized as there snapshot, but it is uncertain whether an replaying party will be able to handle such a non-instantiated snapshot).
 * Rather, when using `onAction` middleware, one should consider in passing arguments which are 1: an id, 2: a (relative) path, or 3: a snapshot. Instead of a real MST node.
 *
 * Example:
 * ```ts
 * const Todo = types.model('', {
 *   task: types.string
 * })
 *
 * const TodoStore = types.model('', {
 *   todos: types.array(Todo)
 * }).actions(self => ({
 *   add(todo) {
 *     self.todos.push(todo);
 *   }
 * }))
 *
 * const s = TodoStore.create({ todos: [] })
 *
 * let disposer = onAction(s, (call) => {
 *   console.log(call);
 * })
 *
 * s.add({ task: "Grab a coffee" })
 * // Logs: { name: "add", path: "", args: [{ task: "Grab a coffee" }] }
 * ```
 *
 * @param target
 * @param listener
 * @param attachAfter (default false) fires the listener *after* the action has executed instead of before.
 * @returns
 */
// eslint-disable-next-line max-lines-per-function
export function onAction(
  target: IAnyStateTreeNode,
  listener: (call: ISerializedActionCall) => void,
  attachAfter = false
): IDisposer {
  // check all arguments
  assertIsStateTreeNode(target, 1);

  if (devMode()) {
    if (!isRoot(target)) {
      warnError(
        // eslint-disable-next-line max-len
        'Warning: Attaching onAction listeners to non root nodes is dangerous: No events will be emitted for actions initiated higher up in the tree.'
      );
    }

    if (!isProtected(target)) {
      warnError(
        // eslint-disable-next-line max-len
        'Warning: Attaching onAction listeners to non protected nodes is dangerous: No events will be emitted for direct modifications without action.'
      );
    }
  }

  // eslint-disable-next-line prefer-arrow-callback
  return addMiddleware(target, function handler(rawCall, next) {
    if (rawCall.type === 'action' && rawCall.id === rawCall.rootId) {
      const sourceNode = getStateTreeNode(rawCall.context);
      const info = {
        name: rawCall.name,
        path: getRelativePathBetweenNodes(getStateTreeNode(target), sourceNode),
        args: rawCall.args.map((arg: any, index: number) => serializeArgument(sourceNode, rawCall.name, index, arg)),
      };

      if (attachAfter) {
        const res = next(rawCall);

        listener(info);

        return res;
        // eslint-disable-next-line no-else-return
      } else {
        listener(info);

        return next(rawCall);
      }
      // eslint-disable-next-line no-else-return
    } else {
      return next(rawCall);
    }
  });
}
