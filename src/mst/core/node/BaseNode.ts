import { createAtom, IAtom } from 'mobx';

import {
    AnyObjectNode, devMode, escapeJsonPath, EventHandlers, fail, Hook, IDisposer, NodeLifeCycle,
} from '../../internal';
import { IAnyType } from '../type/Type';

type IHookSubscribers = {
  [key in Hook]: (node: AnyNode, hook: Hook) => void;
};

export abstract class BaseNode<S, T> {
  environment: any;
  // usually the same type as the value, but not always (such as with references)
  storedValue!: any;

  readonly type: IAnyType;

  private _escapedSubpath?: string;
  private _hookSubscribers?: EventHandlers<IHookSubscribers>;
  private _parent!: AnyObjectNode | null;
  private _pathUponDeath?: string;
  private _state = NodeLifeCycle.INITIALIZING;
  private _subpath!: string;
  private _subpathUponDeath?: string;
  private aliveAtom?: IAtom;
  private pathAtom?: IAtom;

  constructor(type: IAnyType, parent: AnyObjectNode | null, subpath: string, environment: any) {
    this.type = type;
    this.environment = environment;
    this.baseSetParent(parent, subpath);
  }

  get subpath(): string {
    return this._subpath;
  }

  get subpathUponDeath(): string | undefined {
    return this._subpathUponDeath;
  }

  protected get pathUponDeath(): string | undefined {
    return this._pathUponDeath;
  }

  get value(): T {
    return (this.type as any).getValue(this);
  }

  get state(): NodeLifeCycle {
    return this._state;
  }

  set state(value: NodeLifeCycle) {
    const wasAlive = this.isAlive;

    this._state = value;

    if (this.aliveAtom && wasAlive !== this.isAlive) this.aliveAtom.reportChanged();
  }

  get parent(): AnyObjectNode | null {
    return this._parent;
  }

  /** Returns (escaped) path representation as string */
  get path(): string {
    return this.getEscapedPath(true);
  }

  get isRoot(): boolean {
    return this.parent === null;
  }

  get isAlive(): boolean {
    return this.state !== NodeLifeCycle.DEAD;
  }

  get isDetaching(): boolean {
    return this.state === NodeLifeCycle.DETACHING;
  }

  get observableIsAlive(): boolean {
    if (!this.aliveAtom) this.aliveAtom = createAtom('alive');

    this.aliveAtom.reportObserved();

    return this.isAlive;
  }

  getReconciliationType(): IAnyType {
    return this.type;
  }

  registerHook<H extends Hook>(hook: H, hookHandler: IHookSubscribers[H]): IDisposer {
    if (!this._hookSubscribers) this._hookSubscribers = new EventHandlers();

    return this._hookSubscribers.register(hook, hookHandler);
  }

  protected baseAboutToDie(): void {
    this.fireHook(Hook.beforeDestroy);
  }

  protected baseFinalizeCreation(whenFinalized?: () => void): void {
    if (devMode()) {
      if (!this.isAlive) throw fail('assertion failed: cannot finalize the creation of a node that is already dead');
    }

    // goal: afterCreate hooks runs depth-first. After attach runs parent first, so on afterAttach the parent has completed already
    if (this.state === NodeLifeCycle.CREATED) {
      if (this.parent) {
        // parent not ready yet, postpone
        if (this.parent.state !== NodeLifeCycle.FINALIZED) return;

        this.fireHook(Hook.afterAttach);
      }

      this.state = NodeLifeCycle.FINALIZED;

      if (whenFinalized) whenFinalized();
    }
  }

  protected baseFinalizeDeath(): void {
    if (this._hookSubscribers) this._hookSubscribers.clearAll();

    this._subpathUponDeath = this._subpath;
    this._pathUponDeath = this.getEscapedPath(false);
    this.baseSetParent(null, '');
    this.state = NodeLifeCycle.DEAD;
  }

  protected baseSetParent(parent: AnyObjectNode | null, subpath: string): void {
    this._parent = parent;
    this._subpath = subpath;
    this._escapedSubpath = undefined; // regenerate when needed

    if (this.pathAtom) this.pathAtom.reportChanged();
  }

  protected fireInternalHook(name: Hook): void {
    if (this._hookSubscribers) this._hookSubscribers.emit(name, this, name);
  }

  protected getEscapedPath(reportObserved: boolean): string {
    if (reportObserved) {
      if (!this.pathAtom) this.pathAtom = createAtom('path');

      this.pathAtom.reportObserved();
    }

    if (!this.parent) return '';
    // regenerate escaped subpath if needed
    if (this._escapedSubpath === undefined) {
      this._escapedSubpath = !this._subpath ? '' : escapeJsonPath(this._subpath);
    }

    return this.parent.getEscapedPath(reportObserved) + '/' + this._escapedSubpath;
  }

  abstract get root(): AnyObjectNode;
  abstract get snapshot(): S;

  abstract aboutToDie(): void;
  abstract die(): void;
  abstract finalizeCreation(): void;
  abstract finalizeDeath(): void;
  abstract getSnapshot(): S;
  abstract setParent(newParent: AnyObjectNode | null, subpath: string | null): void;

  protected abstract fireHook(name: Hook): void;
}

export type AnyNode = BaseNode<any, any>;
