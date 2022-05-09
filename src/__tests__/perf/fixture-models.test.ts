import { configure } from 'mobx';

import { unprotect } from '../../mst/index';
import { Hero, Monster, Treasure } from './fixtures/fixture-models';

const SAMPLE_HERO = {
  id: 1,
  name: 'jimmy',
  level: 1,
  role: 'cleric',
  description: 'hi',
};

it('Hero computed fields', () => {
  const hero = Hero.create(SAMPLE_HERO);

  expect(hero.descriptionLength).toBe(2);
});

it('Tresure', () => {
  const treasure = Treasure.create({ gold: 1, trapped: true });

  expect(treasure.trapped).toBe(true);
  expect(treasure.gold).toBe(1);
});

it('Monster computed fields', () => {
  configure({
    enforceActions: 'never',
  });

  const monster = Monster.create({
    id: 'foo',
    level: 1,
    maxHp: 3,
    hp: 1,
    warning: 'boo!',
    createdAt: new Date(),
    treasures: [
      { gold: 2, trapped: true },
      { gold: 3, trapped: true },
    ],
    eatenHeroes: [SAMPLE_HERO],
    hasFangs: true,
    hasClaws: true,
    hasWings: true,
    hasGrowl: true,
    freestyle: null,
  });

  expect(monster.isAlive).toBe(true);
  expect(monster.isFlashingRed).toBe(true);
  unprotect(monster);
  expect(monster.weight).toBe(2);
  monster.level = 0;
  monster.hasFangs = false;
  monster.hasWings = false;
  monster.eatenHeroes = null;
  expect(monster.weight).toBe(1);
  monster.hp = 0;
  expect(monster.isFlashingRed).toBe(false);
  expect(monster.isAlive).toBe(false);
});
