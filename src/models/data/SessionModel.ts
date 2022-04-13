import { flow, getEnv, getIdentifier, getSnapshot, Instance, SnapshotIn, SnapshotOut } from 'mobx-state-tree';

import { IEnvironment } from '../../types';
import { fail } from '../../utils';
import DataSourceModel from './DataSourceModel';

const SessionModel = DataSourceModel.named('SessionModel')
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
  .actions(self => ({
    load: flow(function* (...params) {
      if (!self.restore()) yield self.pipe.async([self.load.bind(self, ...(params as unknown[])), self.save]);
    }),
  }));

export interface ISessionModel extends Instance<typeof SessionModel> {}
export interface ISessionModelSnapshotIn extends SnapshotIn<ISessionModel> {}
export interface ISessionModelSnapshotOut extends SnapshotOut<ISessionModel> {}
export default SessionModel;
