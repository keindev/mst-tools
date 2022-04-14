import { flow, getSnapshot, IAnyModelType, SnapshotIn } from 'mobx-state-tree';

import { effect, types } from '../../index';

describe('Core effects', () => {
  it('Create model with effects', async () => {
    const snapshots: SnapshotIn<IAnyModelType>[] = [];
    const Model = types
      .model('Model', {
        field: types.string,
        isLoading: types.flag,
        isLoaded: types.flag,
      })
      .effects((self, { isLoading, isLoaded }) => ({
        load: effect(
          function* (field: string) {
            snapshots.push(['Effect in process (begin)', getSnapshot(self)]);
            self.field = (yield new Promise<string>(resolve => setTimeout(() => resolve(field)))) as string;
            snapshots.push(['Effect in process (end)', getSnapshot(self)]);
          },
          { isLoading, isLoaded }
        ),
      }))
      .actions(self => ({
        action: flow(function* () {
          snapshots.push(['Start effect action', getSnapshot(self)]);
          yield self.load('effect value');
          snapshots.push(['End effect action', getSnapshot(self)]);
        }),
      }));

    const store = Model.create({ field: 'default value' });

    await store.action();

    expect(snapshots).toMatchSnapshot();
  });

  it('Extend model effects with "props" without "named"', async () => {
    const snapshots: SnapshotIn<IAnyModelType>[] = [];
    const ModelA = types.model('ModelA', {
      isLoading: types.flag,
      isLoaded: types.flag,
    });
    const ModelB = ModelA.props({
      field: types.string,
    })
      .effects((self, { isLoading, isLoaded }) => ({
        load: effect(
          function* (field: string) {
            snapshots.push(['Effect in process (begin)', getSnapshot(self)]);
            self.field = (yield new Promise<string>(resolve => setTimeout(() => resolve(field)))) as string;
            snapshots.push(['Effect in process (end)', getSnapshot(self)]);
          },
          { isLoading, isLoaded }
        ),
      }))
      .actions(self => ({
        action: flow(function* () {
          snapshots.push(['Start effect action', getSnapshot(self)]);
          yield self.load('effect value');
          snapshots.push(['End effect action', getSnapshot(self)]);
        }),
      }));

    const store = ModelB.create({ field: 'default value' });

    await store.action();

    expect(snapshots).toMatchSnapshot();
  });

  it('Extend model effects with "props" with "named"', async () => {
    const snapshots: SnapshotIn<IAnyModelType>[] = [];
    const ModelA = types.model('ModelA', {
      isLoading: types.flag,
      isLoaded: types.flag,
    });
    const ModelB = ModelA.named('ModelB')
      .props({
        field: types.string,
      })
      .effects((self, { isLoading, isLoaded }) => ({
        load: effect(
          function* (field: string) {
            snapshots.push(['Effect in process (begin)', getSnapshot(self)]);
            self.field = (yield new Promise<string>(resolve => setTimeout(() => resolve(field)))) as string;
            snapshots.push(['Effect in process (end)', getSnapshot(self)]);
          },
          { isLoading, isLoaded }
        ),
      }))
      .actions(self => ({
        action: flow(function* () {
          snapshots.push(['Start effect action', getSnapshot(self)]);
          yield self.load('effect value');
          snapshots.push(['End effect action', getSnapshot(self)]);
        }),
      }));

    const store = ModelB.create({ field: 'default value' });

    await store.action();

    expect(snapshots).toMatchSnapshot();
  });

  it('Compose models with effects', async () => {
    const snapshots: SnapshotIn<IAnyModelType>[] = [];
    const ModelA = types
      .model('ModelA', {
        isModelALoading: types.flag,
        isModelALoaded: types.flag,
      })
      .effects((self, { isModelALoading, isModelALoaded }) => ({
        loadA: effect(
          function* () {
            snapshots.push(['Effect A in process (begin)', getSnapshot(self)]);
            yield new Promise<void>(resolve => setTimeout(() => resolve()));
            snapshots.push(['Effect A in process (end)', getSnapshot(self)]);
          },
          { isModelALoading, isModelALoaded }
        ),
      }));

    const ModelB = types
      .model('ModelB', {
        isModelBLoading: types.flag,
        isModelBLoaded: types.flag,
      })
      .effects((self, { isModelBLoading, isModelBLoaded }) => ({
        loadB: effect(
          function* () {
            snapshots.push(['Effect B in process (begin)', getSnapshot(self)]);
            yield new Promise<void>(resolve => setTimeout(() => resolve()));
            snapshots.push(['Effect B in process (end)', getSnapshot(self)]);
          },
          { isModelBLoading, isModelBLoaded }
        ),
      }));

    const ModelC = types
      .compose('ModelC', ModelA, ModelB)
      .props({
        field: types.string,
        isModelCLoading: types.flag,
        isModelCLoaded: types.flag,
      })
      .effects((self, { isModelCLoading, isModelCLoaded }) => ({
        load: effect(
          function* (field: string) {
            snapshots.push(['Effect in process (begin)', getSnapshot(self)]);
            yield self.loadA();
            yield self.loadB();
            self.field = (yield new Promise<string>(resolve => setTimeout(() => resolve(field)))) as string;
            snapshots.push(['Effect in process (end)', getSnapshot(self)]);
          },
          { isModelCLoading, isModelCLoaded }
        ),
      }))
      .actions(self => ({
        action: flow(function* () {
          snapshots.push(['Start C effect action', getSnapshot(self)]);
          yield self.load('effect value');
          snapshots.push(['End C effect action', getSnapshot(self)]);
        }),
      }));

    const store = ModelC.create({ field: 'default value' });

    await store.action();

    expect(snapshots).toMatchSnapshot();
  });
});
