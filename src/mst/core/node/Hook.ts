export enum Hook {
  afterCreate = 'afterCreate',
  afterAttach = 'afterAttach',
  afterCreationFinalization = 'afterCreationFinalization',
  beforeDetach = 'beforeDetach',
  beforeDestroy = 'beforeDestroy',
}

export interface IHooks {
  [Hook.afterAttach]?: () => void;
  [Hook.afterCreate]?: () => void;
  [Hook.beforeDestroy]?: () => void;
  [Hook.beforeDetach]?: () => void;
}

export type IHooksGetter<T> = (self: T) => IHooks;
