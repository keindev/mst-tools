import { entries, IObservableArray, observable, values } from 'mobx';

import { AnyObjectNode, fail, IAnyComplexType, mobxShallow, ObjectNode } from '../../internal';

let identifierCacheId = 0;

export class IdentifierCache {
  // n.b. in cache all identifiers are normalized to strings
  private readonly cache = observable.map<string, IObservableArray<AnyObjectNode>>();
  private readonly cacheId = identifierCacheId++;
  // last time the cache (array) for a given time changed
  // n.b. it is not really the time, but just an integer that gets increased after each modification to the array
  private readonly lastCacheModificationPerId = observable.map<string, number>();

  addNodeToCache(node: AnyObjectNode, lastCacheUpdate = true): void {
    if (node.identifierAttribute) {
      const identifier = node.identifier!;

      if (!this.cache.has(identifier)) {
        this.cache.set(identifier, observable.array<AnyObjectNode>([], mobxShallow));
      }
      const set = this.cache.get(identifier)!;

      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      if (set.indexOf(node) !== -1) throw fail('Already registered');
      set.push(node);

      if (lastCacheUpdate) {
        this.updateLastCacheModificationPerId(identifier);
      }
    }
  }

  getLastCacheModificationPerId(identifier: string): string {
    const modificationId = this.lastCacheModificationPerId.get(identifier) || 0;

    return `${this.cacheId}-${modificationId}`;
  }

  has(type: IAnyComplexType, identifier: string): boolean {
    const set = this.cache.get(identifier);

    if (!set) return false;

    return set.some(candidate => type.isAssignableFrom(candidate.type));
  }

  mergeCache(node: AnyObjectNode): void {
    values(node.identifierCache!.cache).forEach(nodes =>
      nodes.forEach(child => {
        this.addNodeToCache(child);
      })
    );
  }

  notifyDied(node: AnyObjectNode): void {
    if (node.identifierAttribute) {
      const id = node.identifier!;
      const set = this.cache.get(id);

      if (set) {
        set.remove(node);

        // remove empty sets from cache
        if (!set.length) {
          this.cache.delete(id);
        }
        this.updateLastCacheModificationPerId(node.identifier!);
      }
    }
  }

  resolve<IT extends IAnyComplexType>(
    type: IT,
    identifier: string
  ): ObjectNode<IT['CreationType'], IT['SnapshotType'], IT['TypeWithoutSTN']> | null {
    const set = this.cache.get(identifier);

    if (!set) return null;
    const matches = set.filter(candidate => type.isAssignableFrom(candidate.type));

    switch (matches.length) {
      case 0:
        return null;
      case 1:
        return matches[0]!;
      default:
        throw fail(
          `Cannot resolve a reference to type '${
            type.name
          }' with id: '${identifier}' unambiguously, there are multiple candidates: ${matches
            .map(n => n.path)
            .join(', ')}`
        );
    }
  }

  splitCache(node: AnyObjectNode): IdentifierCache {
    const res = new IdentifierCache();
    const basePath = node.path;

    entries(this.cache).forEach(([id, nodes]) => {
      let modified = false;

      for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i]!.path.indexOf(basePath) === 0) {
          res.addNodeToCache(nodes[i]!, false); // no need to update lastUpdated since it is a whole new cache
          nodes.splice(i, 1);
          modified = true;
        }
      }

      if (modified) {
        this.updateLastCacheModificationPerId(id);
      }
    });

    return res;
  }

  private updateLastCacheModificationPerId(identifier: string): void {
    const lcm = this.lastCacheModificationPerId.get(identifier);

    // we start at 1 since 0 means no update since cache creation
    this.lastCacheModificationPerId.set(identifier, lcm === undefined ? 1 : lcm + 1);
  }
}
