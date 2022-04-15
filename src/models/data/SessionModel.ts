import { flow, getEnv, getIdentifier, getSnapshot, Instance, SnapshotIn, SnapshotOut } from 'mobx-state-tree';

import { IEnvironment } from '../../types';
import { fail } from '../../utils';
import { DataSourceModel } from './DataSourceModel';

export const SessionModel = DataSourceModel.named('SessionModel')
  .views(self => ({
    get __sessionId(): string {
      const id = getIdentifier(self);
      const { version = 'unversioned' } = getEnv<IEnvironment>(self);

      if (!id) throw fail('SessionModel must have identifier field');

      return `${id}-${version}`;
    },
  }))
  .actions(self => ({
    restore(): boolean {
      const snapshot = sessionStorage.getItem(self.__sessionId);

      if (snapshot) self.patch(JSON.parse(snapshot));

      return !!snapshot;
    },
    save() {
      sessionStorage.setItem(self.__sessionId, JSON.stringify(getSnapshot(self)));
    },
  }))
  .actions(({ restore, pipe, save, load }) => ({
    load: flow(function* (...params) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!restore()) yield pipe.sync([load.bind(self, ...(params as any[])), save]);
    }),
  }));

export interface ISessionModel extends Instance<typeof SessionModel> {}
export interface ISessionModelSnapshotIn extends SnapshotIn<ISessionModel> {}
export interface ISessionModelSnapshotOut extends SnapshotOut<ISessionModel> {}
