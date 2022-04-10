import { flow } from 'mobx-state-tree';

import { effect, types } from '../';

const TestModel = types
  .model('TestModel', {
    field: types.string,
    isLoad: types.flag,
    isLoaded: types.flag,
  })
  .effects((self, { isLoad, isLoaded }) => ({
    load: effect(
      function* (id: string) {
        // eslint-disable-next-line no-console
        console.log('Flag:', self.isLoad, self.isLoaded);

        yield new Promise((resolve): void => {
          // eslint-disable-next-line @typescript-eslint/no-magic-numbers
          setTimeout(() => resolve({}), 2000);
        });

        return `test promise ${id}`;
      },
      { isLoad, isLoaded }
    ),
  }))
  // eslint-disable-next-line max-lines-per-function
  .actions(self => ({
    action: flow(function* () {
      // eslint-disable-next-line no-console
      console.log('Flag:', self.isLoad, self.isLoaded);

      const result = yield self.load('just');

      self.isLoaded = true;

      // eslint-disable-next-line no-console
      console.log('Flag:', self.isLoad, self.isLoaded);
      // eslint-disable-next-line no-console
      console.log('Result:', result);

      return result;
    }),
  }));

const store = TestModel.create({ field: 'test' });

// eslint-disable-next-line no-console
console.log('Field:', store.field);

const test = await store.action();

// eslint-disable-next-line no-console
console.log('Action:', test);
