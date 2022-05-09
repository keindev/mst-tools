import { configure } from 'mobx';

import { types } from '../../index';
import { unprotect } from '../../mst/index';

enum ColorEnum {
  Red = 'Red',
  Orange = 'Orange',
  Green = 'Green',
}
const colorEnumValues = Object.values(ColorEnum) as ColorEnum[];

it('should support enums', () => {
  configure({
    enforceActions: 'never',
  });

  const TrafficLight = types.model('', { color: types.enumeration('Color', colorEnumValues) });

  expect(TrafficLight.is({ color: ColorEnum.Green })).toBe(true);
  expect(TrafficLight.is({ color: 'Blue' })).toBe(false);
  expect(TrafficLight.is({ color: undefined })).toBe(false);

  const l = TrafficLight.create({ color: ColorEnum.Orange });

  unprotect(l);
  l.color = ColorEnum.Red;

  expect(TrafficLight.describe()).toBe('{ color: ("Red" | "Orange" | "Green") }');
  expect(() => (l.color = 'Blue' as any)).toThrowError(/Error while converting `"Blue"` to `Color`/);
});

it('should support anonymous enums', () => {
  configure({
    enforceActions: 'never',
  });

  const TrafficLight = types.model('', { color: types.enumeration(colorEnumValues) });
  const l = TrafficLight.create({ color: ColorEnum.Orange });

  unprotect(l);
  l.color = ColorEnum.Red;
  expect(TrafficLight.describe()).toBe('{ color: ("Red" | "Orange" | "Green") }');
  expect(() => (l.color = 'Blue' as any)).toThrowError(
    /Error while converting `"Blue"` to `"Red" | "Orange" | "Green"`/
  );
});

it('should support optional enums', () => {
  const TrafficLight = types.optional(types.enumeration(colorEnumValues), ColorEnum.Orange);
  const l = TrafficLight.create();

  expect(l).toBe(ColorEnum.Orange);
});

it('should support optional enums inside a model', () => {
  const TrafficLight = types.model('', {
    color: types.optional(types.enumeration(colorEnumValues), ColorEnum.Orange),
  });
  const l = TrafficLight.create({});

  expect(l.color).toBe(ColorEnum.Orange);
});
