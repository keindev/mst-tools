import { action } from 'mobx';

import { AnyObjectNode, BaseNode, devMode, fail, freeze, Hook, NodeLifeCycle, SimpleType } from '../../internal';

export class ScalarNode<C, S, T> extends BaseNode<S, T> {
  // note about hooks:
  // - afterCreate is not emitted in scalar nodes, since it would be emitted in the constructor, before it can be subscribed by anybody
  // - afterCreationFinalization could be emitted, but there's no need for it right now
  // - beforeDetach is never emitted for scalar nodes, since they cannot be detached

  declare readonly type: SimpleType<C, S, T>;

  constructor(
    simpleType: SimpleType<C, S, T>,
    parent: AnyObjectNode | null,
    subpath: string,
    environment: any,
    initialSnapshot: C
  ) {
    super(simpleType, parent, subpath, environment);
    try {
      this.storedValue = simpleType.createNewInstance(initialSnapshot);
    } catch (e) {
      // short-cut to die the instance, to avoid the snapshot computed starting to throw...
      this.state = NodeLifeCycle.DEAD;
      throw e;
    }

    this.state = NodeLifeCycle.CREATED;
    this.finalizeCreation();
  }

  get snapshot(): S {
    return freeze(this.getSnapshot());
  }

  get root(): AnyObjectNode {
    // future optimization: store root ref in the node and maintain it
    if (!this.parent) throw fail('This scalar node is not part of a tree');

    return this.parent.root;
  }

  aboutToDie(): void {
    this.baseAboutToDie();
  }

  die(): void {
    if (!this.isAlive || this.state === NodeLifeCycle.DETACHING) return;

    this.aboutToDie();
    this.finalizeDeath();
  }

  finalizeCreation(): void {
    this.baseFinalizeCreation();
  }

  finalizeDeath(): void {
    this.baseFinalizeDeath();
  }

  getSnapshot(): S {
    return this.type.getSnapshot(this);
  }

  setParent(newParent: AnyObjectNode, subpath: string): void {
    const parentChanged = this.parent !== newParent;
    const subpathChanged = this.subpath !== subpath;

    if (!parentChanged && !subpathChanged) {
      return;
    }

    if (devMode()) {
      if (!subpath) throw fail('assertion failed: subpath expected');
      if (!newParent) throw fail('assertion failed: parent expected');
      if (parentChanged) throw fail('assertion failed: scalar nodes cannot change their parent');
    }

    this.environment = undefined;
    this.baseSetParent(this.parent, subpath);
  }

  toString(): string {
    const path = (this.isAlive ? this.path : this.pathUponDeath) || '<root>';

    return `${this.type.name}@${path}${this.isAlive ? '' : ' [dead]'}`;
  }

  protected fireHook(name: Hook): void {
    this.fireInternalHook(name);
  }
}
ScalarNode.prototype.die = action(ScalarNode.prototype.die);
