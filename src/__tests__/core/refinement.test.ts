import { types } from '../../index';
import { getSnapshot } from '../../mst/index';

it('should allow if type and predicate is correct', () => {
  const Factory = types.model('', {
    number: types.refinement('positive number', types.optional(types.number, 0), s => typeof s === 'number' && s >= 0),
  });
  const doc = Factory.create({ number: 42 });

  expect(getSnapshot(doc)).toEqual({ number: 42 });
});

it('should throw if a correct type with failing predicate is given', () => {
  const Factory = types.model('', {
    number: types.refinement('positive number', types.optional(types.number, 0), s => typeof s === 'number' && s >= 0),
  });

  expect(() => {
    Factory.create({ number: 'givenStringInstead' } as any);
  }).toThrowError(
    // eslint-disable-next-line max-len
    '[mobx-state-tree] Error while converting `{"number":"givenStringInstead"}` to `AnonymousModel`:\n\n    at path "/number" value `"givenStringInstead"` is not assignable to type: `positive number` (Value is not a number).'
  );
  expect(() => {
    Factory.create({ number: -4 });
  }).toThrowError(
    // eslint-disable-next-line max-len
    '[mobx-state-tree] Error while converting `{"number":-4}` to `AnonymousModel`:\n\n    at path "/number" value `-4` is not assignable to type: `positive number` (Value does not respect the refinement predicate).'
  );
});

it('should throw custom error message with failing predicate is given', () => {
  const Factory = types.model('', {
    number: types.refinement(
      types.optional(types.number, 0),
      s => typeof s === 'number' && s >= 0,
      _s => 'A positive number was expected'
    ),
  });

  expect(() => {
    Factory.create({ number: 'givenStringInstead' } as any);
  }).toThrowError(
    // eslint-disable-next-line max-len
    '[mobx-state-tree] Error while converting `{"number":"givenStringInstead"}` to `AnonymousModel`:\n\n    at path "/number" value `"givenStringInstead"` is not assignable to type: `number` (Value is not a number).'
  );
  expect(() => {
    Factory.create({ number: -4 });
  }).toThrowError(
    // eslint-disable-next-line max-len
    '[mobx-state-tree] Error while converting `{"number":-4}` to `AnonymousModel`:\n\n    at path "/number" value `-4` is not assignable to type: `number` (A positive number was expected).'
  );
});
