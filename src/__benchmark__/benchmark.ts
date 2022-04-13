/* eslint-disable no-console */
import Benchmark from 'benchmark';
import colors from 'colors';
import { castToSnapshot, flow, types as _types } from 'mobx-state-tree';

import effect from '../core/effect';
import types from '../core/types';

const suite = new Benchmark.Suite();

console.log(colors.underline('Test perf (model creation):'));
suite.add(colors.green('[mobx-state-tree]'), () => {
  const A = _types.model('A', { a: _types.string, b: _types.boolean, c: _types.array(_types.string) });
  const B = _types.model('B', { a: _types.boolean, b: _types.number, c: _types.array(_types.boolean) });
  const model = _types
    .compose(A, B)
    .named('Model')
    .props({
      a: _types.maybe(_types.number),
      b: _types.maybe(_types.number),
      c: _types.maybe(_types.number),
      isLoaded: _types.optional(_types.boolean, false),
      isLoading: _types.optional(_types.boolean, false),
    })
    .actions(self => ({
      load: flow(function* () {
        self.isLoaded = false;
        self.isLoading = true;
        yield Promise.resolve();
        self.isLoaded = true;
        self.isLoading = false;
      }),
    }));

  model.create(castToSnapshot({}));
});

suite.add(colors.green('[mst-tools]'), () => {
  const A = types.model('A', { a: types.string, b: types.boolean, c: types.array(types.string) });
  const B = types.model('B', { a: types.boolean, b: types.number, c: types.array(types.boolean) });
  const model = types
    .compose(A, B)
    .named('Model')
    .props({
      a: types.maybe(types.number),
      b: types.maybe(types.number),
      c: types.maybe(types.number),
      isLoaded: types.flag,
      isLoading: types.flag,
    })
    .effects((_, { isLoading, isLoaded }) => ({
      load: effect(
        function* () {
          yield Promise.resolve();
        },
        { isLoading, isLoaded }
      ),
    }));

  model.create(castToSnapshot({}));
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
suite.on('cycle', (event: any) => console.log(String(event.target)));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
suite.on('complete', (event: any) => {
  console.log(`# Fastest is ${colors.underline(event.currentTarget.filter('fastest').map('name').pop())}`);
});

suite.run();
