import switcher from '../../core/switcher';
import { types } from '../../index';

describe('Core switchers', () => {
  it('Create model with switchers', () => {
    const Model = types
      .model('Model', {
        isVisible: types.flag,
      })
      .switch(() => ({
        show: switcher({ isVisible: true }),
        hide: switcher({ isVisible: false }),
      }));

    const store = Model.create({});

    expect(store.isVisible).toBeFalsy();

    store.show();

    expect(store.isVisible).toBeTruthy();

    store.hide();

    expect(store.isVisible).toBeFalsy();
  });
});
