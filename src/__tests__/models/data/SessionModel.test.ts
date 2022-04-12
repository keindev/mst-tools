/**
 * @jest-environment jsdom
 */

import types from '../../../core/types';
import SessionModel from '../../../models/data/SessionModel';

describe('SessionModel', () => {
  const ID = 'test';
  const VERSION = '1.0';

  sessionStorage.setItem(
    `${ID}-${VERSION}`,
    JSON.stringify({ isLoaded: true, isLoading: false, field: 'sessionValue' })
  );

  it('Loading', async () => {
    const model = SessionModel.named('MySessionModel').props({
      id: types.identifier,
      field: types.optional(types.string, 'default'),
    });

    const store = model.create({ id: ID }, { version: VERSION });

    expect(store.field).toBe('default');
    expect(store.isLoaded).toBeFalsy();

    await store.refresh();

    expect(store.field).toBe('sessionValue');
    expect(store.isLoaded).toBeTruthy();
  });
});
